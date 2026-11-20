const assert = require('node:assert/strict');
const { test } = require('node:test');
// Captured from localhost:1349 after "started": only neutral metadata and
// team3.player5's original tier entries retained, with all choices unchanged.
const liveNeutral = require('./fixtures/neutral-7.42-live.json');

// Synthetic regression fixture modeled on live Dota 7.42, not an untouched excerpt.
// Includes a deliberate tier2 safety-bubble choice4 selection; no account or match identifiers.
const neutral = () => ({
  max_madstone: 40,
  ...Object.fromEntries([0, 1, 2, 3].map(tier => [`tier${tier}`, {
    tier,
    drop_after_time: [0, 900, 1800, 3000][tier],
    madstone_required: [6, 10, 10, 14][tier],
    escalating_recraft_cost: tier === 3 ? 6 : 0
  }])),
  team2: { player3: { tier2: {
    tier: 2,
    times_crafted: 1,
    trinket_choices: {
      choice0: { item_name: 'item_idol_of_screeauk', selected: false },
      choice4: { item_name: 'item_safety_bubble', selected: true }
    },
    enchantment_choices: {
      choice1: { item_name: 'item_enhancement_greedy', item_level: 1, selected: true }
    }
  } } },
  team3: { player5: { tier1: {
    tier: 1,
    trinket_choices: { choice0: { item_name: 'item_safety_bubble', selected: true } },
    enchantment_choices: {
      choice4: { item_name: 'item_enhancement_keen_eyed', item_level: 1, selected: true }
    }
  }, tier3: { tier: 3, trinket_choices: {}, enchantment_choices: {} } } }
});

const packet = neutralitems => ({
  provider: { name: 'Dota 2', appid: 570, version: 1, timestamp: 0 },
  map: { game_time: 1800, win_team: 'none' },
  player: { team2: {}, team3: {} },
  draft: {},
  neutralitems
});

for (const format of ['CJS', 'ESM']) {
  test(`${format}: digest neutral projection`, async t => {
    const { DOTA2GSI } = format === 'CJS'
      ? require('@lexogrine/dotagsi')
      : await import('@lexogrine/dotagsi');
    const digest = raw => new DOTA2GSI().digest(packet(raw)).neutral_items;

    await t.test('sanitized live 7.42 packet preserves four tiers and actual selections', () => {
      const raw = structuredClone(liveNeutral);
      const result = digest(raw);
      const tiers = ['tier0', 'tier1', 'tier2', 'tier3'];
      assert.deepEqual(Object.keys(result).filter(key => key.startsWith('tier')), tiers);
      assert.deepEqual(Object.keys(result.team3), tiers);
      for (const key of tiers) assert.deepEqual(result[key], liveNeutral[key]);
      const selections = [
        ['item_kobold_cup', 'item_enhancement_mystical'],
        ['item_safety_bubble', 'item_enhancement_keen_eyed'],
        ['item_idol_of_screeauk', 'item_enhancement_greedy']
      ];
      selections.forEach(([name, enchantment_name], tier) => {
        assert.deepEqual(result.team3[`tier${tier}`], { item0: {
          state: 'selected', name, tier, player_id: 5,
          enchantment_name, enchantment_level: 1
        } });
      });
      assert.deepEqual(result.team3.tier3, {});
      assert.equal('team2' in result, false);
      assert.deepEqual(raw, liveNeutral);
    });

    await t.test('four actual tiers, choice4, exact IDs, optional levels and no input mutation', () => {
      const raw = neutral();
      const before = structuredClone(raw);
      const gsi = new DOTA2GSI();
      let emitted;
      gsi.on('data', data => { emitted = data; });
      const data = gsi.digest(packet(raw));
      assert.equal(data, emitted);
      assert.equal(gsi.current, data);
      const result = data.neutral_items;
      assert.deepEqual(Object.keys(result).filter(key => key.startsWith('tier')), ['tier0', 'tier1', 'tier2', 'tier3']);
      assert.deepEqual(result.tier3, raw.tier3);
      assert.deepEqual(result.team2.tier2.item0, {
        state: 'selected', tier: 2, name: 'item_safety_bubble', player_id: 3,
        enchantment_name: 'item_enhancement_greedy', enchantment_level: 1
      });
      assert.equal(result.team3.tier1.item0.player_id, 5);
      assert.equal(result.team3.tier1.item0.enchantment_name, 'item_enhancement_keen_eyed');
      assert.deepEqual(result.team3.tier3, {});
      assert.equal('tier4' in result.team3, false);
      assert.equal('max_count' in result.tier0, false);
      assert.equal('items_found' in result.team3, false);
      assert.deepEqual(raw, before);
    });

    await t.test('missing teams, tiers and choices are safe; no empty selected items', () => {
      assert.equal(digest(undefined), null);
      assert.deepEqual(digest({}), {});
      assert.deepEqual(digest({ team2: {} }), { team2: {} });
      assert.deepEqual(digest({ team3: { player9: {
        tier0: { tier: 0 },
        tier1: { tier: 1, trinket_choices: { choice4: { selected: false, item_name: 'item_test' } } },
        tier2: { tier: 2, enchantment_choices: { choice4: { selected: true, item_name: 'item_enchantment' } } },
        tier3: { tier: 3, trinket_choices: { choice0: { selected: true, item_name: '' } } }
      } } }), { team3: { tier0: {}, tier1: {}, tier2: {}, tier3: {} } });
    });

    await t.test('numeric roster ordering preserves slots across unselected and missing tiers', () => {
      const selected = { tier: 2, trinket_choices: { choice4: { item_name: 'item_test', selected: true } } };
      const raw = { team3: {
        player9: { tier2: selected }, player7: { tier2: selected }, player5: { tier2: { tier: 2 } },
        player8: {}, player6: { tier2: selected }
      } };
      const tier = digest(raw).team3.tier2;
      assert.deepEqual(Object.keys(tier), ['item1', 'item2', 'item4']);
      assert.deepEqual(Object.values(tier).map(item => item.player_id), [6, 7, 9]);
      assert.ok(Object.values(tier).every(item => item.state === 'selected'));
      assert.equal('enchantment_name' in tier.item1, false);
    });

    await t.test('dynamic tiers, arbitrary player IDs and all choice values; no fabricated levels', () => {
      const raw = { team2: { items_found: 0, player42: { tier6: {
        tier: 7,
        trinket_choices: { choice8: { item_name: 'item_test', item_level: 0, selected: true } },
        enchantment_choices: { choice9: { item_name: 'item_enchantment', selected: true } }
      } } } };
      assert.deepEqual(digest(raw), { team2: { items_found: 0, tier6: { item0: {
        state: 'selected', tier: 7, name: 'item_test', player_id: 42, level: 0,
        enchantment_name: 'item_enchantment'
      } } } });
      raw.team2.player42.tier6.enchantment_choices.choice9.item_level = 0;
      assert.equal(digest(raw).team2.tier6.item0.enchantment_level, 0);
    });

    await t.test('consecutive digests never infer completion or retain stale selections', () => {
      const gsi = new DOTA2GSI();
      const raw = { team2: Object.fromEntries([0, 1, 2, 3, 4].map(id => [`player${id}`, {
        tier0: { tier: 0, trinket_choices: {} }
      }])) };
      gsi.digest(packet(raw));
      for (const player of Object.values(raw.team2)) {
        player.tier0.trinket_choices.choice0 = { item_name: 'item_test', selected: true };
      }
      const tier = gsi.digest(packet(raw)).neutral_items.team2.tier0;
      assert.equal(Object.keys(tier).length, 5);
      assert.equal('completion_time' in tier, false);
      assert.deepEqual(gsi.digest(packet({ team2: {} })).neutral_items, { team2: {} });
    });
  });
}
