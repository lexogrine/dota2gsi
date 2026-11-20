# Dota 2 GSI Digest

## How does it work?
The GSI object takes raw request from Dota 2 GSI's system, parses this to more comfortable form and calls listeners on certain events. You need to configure GSI file and receiving end yourself.

## Installing
### For Node and React
```npm install @lexogrine/dotagsi```

## Example #1
```javascript
import express from 'express';
import { DOTA2GSI } from '@lexogrine/dotagsi';

const app = express();
const GSI = new DOTA2GSI();

app.use(express.urlencoded({extended:true}));
app.use(express.raw({limit:'10Mb', type: 'application/json' }));

app.post('/', (req, res) => {
    const text = req.body.toString().replace(/"(player|owner)":([ ]*)([0-9]+)/gm, '"$1": "$3"').replace(/(player|owner):([ ]*)([0-9]+)/gm, '"$1": "$3"');
    const data = JSON.parse(text);
    GSI.digest(data);
    res.sendStatus(200);
});

GSI.on('data', dota2 => {
    dota2.draft.radiant[0].class;
});

app.listen(3000);
```

## Methods

|Method|Description|Example|Returned objects|
|---|---|---|---|
|`digest(GSIData)`|Gets raw GSI data from Dota 2 and does magic|`GSI.digest(req.body)`|Dota 2 Parsed|
|`on('event', callback)`|Sets listener for given event (check them below)|`GSI.on('data', data => console.log(data));`||

Beside that, DOTA2GSI implements standard Event Emitter interfaces.

## Events

|Event|Name|Callback|
|---|---|---|
|Data incoming|`data`|(data: CSGO Parsed) => {}|


## Objects

### Faction
`dire` or `radiant`

### Item Type
`slot` or `stash` or `teleport` or `neutral`

### Wearable Type
`wearable` or `style`
#### Dota 2 Parsed

|Property|Type|
|---|---|
|provider|`Provider`|
|map|`Map`|
|player|`Player or null`|
|players|`Array of Players`|
|buildings|`Array of Buldings`|
|draft|`Draft`|
|roshan|`Roshan`|
|outposts|`Outposts`|
|events|`Array of Events`|
|neutral_items|`NeutralItems or null`|

#### Team Extension

|Property|Type|
|---|---|
|id|`string`|
|name|`string`|
|country|`string or null`|
|logo|`string or null`|
|map_score|`number`|

#### Player Extension

|Property|Type|
|---|---|
|id|`string`|
|name|`string`|
|steramid|`string`|
|realName|`string or null`|
|country|`string or null`|
|avatar|`string or null`|


### Building

|Property|Type|
|---|---|
|health|`number`|
|max_health|`number`|
|faction|`Faction`|
|attack|`melee` or `range` or `null`|
|type|`tower` or `rax` or `fort`|
|side|`good` or `bad`|
|position|`top` or `mid` or `bot` or `null`|
|number|`number` or `null`|


#### Provider

|Property|Type|
|---|---|
|name|`Dota 2`|
|appid|570|
|version|`number`|
|timestamp|`number`|

#### Map

|Property|Type|
|---|---|
|matchid|`string`|
|name|`string`|
|game_time|`number`|
|clock_time|`number`|
|daytime|`boolean`|
|nightstalker_night|`boolean`|
|game_state|`string`|
|paused|`boolean`|
|win_team|`string`|
|customgamename|`string`|
|roshan_state|`string`|
|roshan_state_end_seconds|`number`|
|radiant_win_chance|`number`|
|radiant|`Team`|
|dire|`Team`|

#### Roshan

|Property|Type|
|---|---|
|alive|`boolean`|
|health|`number`|
|max_health|`number`|
|phase_time_remaining|`number`|
|spawn_phase|`number`|
|xpos|`number`|
|ypos|`number`|
|yaw|`number`|
|items_drop|`Map or Item Names`|

#### Outposts

|Property|Type|
|---|---|
|outsideNorth|`Faction` or `null`|
|jungleNorth|`Faction` or `null`|
|jungleSouth|`Faction` or `null`|
|outsideSouth|`Faction` or `null`|

#### Event

|Property|Type|
|---|---|
|event_type|`string`|
|game_time|`number`|
|various other values, depending on event_type|`unknown`|

#### Neutral Items

Since 2.0.0, `neutral_items` keeps the team/tier projection for HUD boards but
only includes data present in the current packet. Missing `neutralitems` gives
`null`; an empty object gives `{}`. Teams and tiers are optional. Enumerate
`tierN` keys rather than assuming five tiers: Dota 7.42 currently sends
`tier0` through `tier3`. No `tier4` is synthesized.

Version 2.0.0 is a breaking API change: `NeutralItemInTier.state` is now only
`'selected'`, with a required `player_id`; the obsolete `equipped`, `stash`, and
`unknown` neutral-item variants are removed. `completion_time` and the fabricated
`max_count` are removed. Consumers must handle optional teams, tiers, slots, and
levels, and must not infer current equipment or a FASTER comparison from selections.

|Property|Type|
|---|---|
|team2?|`TeamNeutralItems` (Radiant)|
|team3?|`TeamNeutralItems` (Dire)|
|tierN?|`NeutralItemsTierRaw`|

#### Neutral Items Tier Summary
|Property|Type|
|---|---|
|tier|`number`|
|drop_after_time|`number`|
|madstone_required|`number`|
|escalating_recraft_cost|`number`|

Tier summaries are copied from the raw packet, without a fabricated `max_count`.

#### Team Neutral Items Tiers

|Property|Type|
|---|---|
|items_found?|`number`, only when supplied by the game|
|tierN?|`NeutralItemsInTier`, only when present on a team's player|

#### Team Neutral Items in Tier

|Property|Type|
|---|---|
|itemN?|`NeutralItemInTier`|

Players are ordered numerically by their `playerN` keys within each team.
Their positions give `item0` through `item4` for a normal five-player roster.
Slots are assigned before checking selections, so an unselected/missing tier
leaves a hole rather than shifting the remaining players. A partial roster is
ordered among the players actually present; always use `player_id` for identity,
not the slot index. A tier with no selected trinkets is `{}`.

All choice values are searched (including `choice4` and later keys). Only a
selected, nonempty trinket produces an item. Missing choices or an enchantment
without a selected trinket do not create an empty item. `state: 'selected'` means
selected in that tier, not necessarily currently equipped in the inventory.
No completion times are inferred or retained and no
FASTER comparison is supported.

#### Single Neutral Item

|Property|Type|
|---|---|
|name|`string`|
|tier|`number`|
|state|`'selected'` (selection, not current equipment)|
|player_id|`number`, exact numeric suffix of the raw `playerN` key, including Dire IDs|
|level?|`number`, only if the selected trinket supplied `item_level`|
|enchantment_name?|`string`, only if an enchantment is selected|
|enchantment_level?|`number`, only if that enchantment supplied `item_level`|

`tier` is the raw player's tier value, not a constant or the item's original
drop tier. Missing levels are omitted, never replaced by `1` (or `0`).
Raw choices, madstone counters and crafting state remain available in
`Dota2Raw.neutralitems`; they are not added to the HUD projection.

Neutral raw and parsed types are exported from `@lexogrine/dotagsi`, including
`NeutralItemsRaw`, `NeutralItemsTierRaw`, `TeamNeutralItemsRaw`,
`NeutralItemsInPlayerRaw`, `NeutralItemsInPlayerTierRaw`,
`NeutralItemsInPlayerTierChoicesRaw`, `NeutralItemChoiceRaw`, `TierIds`,
`NeutralItems`, `TeamNeutralItems`, `NeutralItemsInTier`, and `NeutralItemInTier`.
Tier and choice maps are typed partial maps, not untyped `{}` unions.

Both `require('@lexogrine/dotagsi')` and `import ... from '@lexogrine/dotagsi'`
resolve to their respective CJS and ESM builds. Run `npm test` (Node 18+) to
build both formats and run the built-in Node regression tests.
The neutral-item test fixture is synthetic regression data modeled on the live
Dota 7.42 shape, including a deliberate tier2 safety-bubble `choice4` selection;
it is not an untouched packet excerpt and contains no account or match identifiers.

#### Team

|Property|Type|
|---|---|
|ward_purchase_cooldown|`number`|
|name|`string`|
|map_score|`number`|
|extra|`Custom object`|
|id|`string` or `null`|
|country|`string` or `null`|
|logo|`string` or `null`|

#### Player

|Property|Type|
|---|---|
|steamid|`string`|
|name|`string`|
|realName|`string` or `null`|
|country|`string` or `null`|
|avatar|`string` or `null`|
|extra|`Custom object`|
|hero|`Hero` or `null`|
|courier|`Courier` or `null`|
|abilities|`Array of Abilities`|
|items|`Array of Items`|
|wearables|`Array of Wearables`|
|kill_list|`Array of KillEntries`|
|activity|`string`|
|kills|`number`|
|deaths|`number`|
|assists|`number`|
|last_hits|`number`|
|denies|`number`|
|kill_streak|`number`|
|commands_issued|`number`|
|team_name|`string`|
|gold|`number`|
|gold_reliable|`number`|
|gold_unreliable|`number`|
|gold_from_hero_kills|`number`|
|gold_from_creep_kills|`number`|
|gold_from_income|`number`|
|gold_from_shared|`number`|
|gpm|`number`|
|xpm|`number`|
|net_worth|`number`|
|hero_damage|`number`|
|wards_purchased|`number`|
|wards_placed|`number`|
|wards_destroyed|`number`|
|runes_activated|`number`|
|camps_stacked|`number`|
|support_gold_spent|`number`|
|consumable_gold_spent|`number`|
|item_gold_spent|`number`|
|gold_lost_to_death|`number`|
|gold_spent_on_buybacks|`number`|


#### Hero

|Property|Type|
|---|---|
|id|`number`|
|xpos?|`number`|
|ypos?|`number`|
|level?|`number`|
|name?|`string`|
|xp?|`number`|
|alive?|`boolean`|
|respawn_seconds?|`number`|
|buyback_cost?|`number`|
|buyback_cooldown?|`number`|
|health?|`number`|
|max_health?|`number`|
|health_percent?|`number`|
|mana?|`number`|
|max_mana?|`number`|
|mana_percent?|`number`|
|silenced?|`boolean`|
|stunned?|`boolean`|
|disarmed?|`boolean`|
|magicimmune?|`boolean`|
|hexed?|`boolean`|
|muted?|`boolean`|
|mana?|`boolean`|
|break?|`boolean`|
|aghanims_scepter|`boolean`|
|aghanims_shard?|`boolean`|
|smoked?|`boolean`|
|has_debuff?|`boolean`|
|selected_unit?|`boolean`|
|talent_1?|`boolean`|
|talent_2?|`boolean`|
|talent_3?|`boolean`|
|talent_4?|`boolean`|
|talent_5?|`boolean`|
|talent_6?|`boolean`|
|talent_7?|`boolean`|
|talent_8?|`boolean`|

#### Courier

|Property|Type|
|---|---|
|health|`number`|
|max_health|`number`|
|alive|`boolean`|
|boost|`boolean`|
|flying_upgrade|`boolean`|
|shield|`boolean`|
|respawn_time_remaining|`number`|
|xpos|`number`|
|ypos|`number`|
|yaw|`number`|
|items|`Array of Courier Item`|
|lost_items|`Array of Courier Item`|
|owner|`number`|
|team?|`Faction`|

#### Courier Item

|Property|Type|
|---|---|
|owner|`number`|
|name|`string`|

#### Ability

|Property|Type|
|---|---|
|id|`number`|
|name|`string`|
|level|`number`|
|can_cast|`boolean`|
|passive|`boolean`|
|ability_active|`boolean`|
|ultimate|`boolean`|
|cooldown|`number`|
|charges?|`number`|
|max_charges?|`number`|
|charge_cooldown?|`number`|

#### Item

|Property|Type|
|---|---|
|id|`number`|
|name|`string`|
|type|`Item Type`|
|can_cast?|`boolean`|
|passive?|`boolean`|
|item_level?|`number`|
|purchaser?|`number`|
|cooldown?|`number`|
|charges?|`number`|


#### Draft

|Property|Type|
|---|---|
|activeteam|`number`|
|pick|`boolean`|
|activeteam_time_remaining|`number`|
|radiant|`Team Draft`|
|dire|`Team Draft`|


#### Team Draft

|Property|Type|
|---|---|
|home_team|`boolean`|
|bonus_time|`number`|
|picks|`Array of Draft Entries`|

#### Draft Entry

|Property|Type|
|---|---|
|type|`pick` or `ban`|
|player_id|`number`|
|class|`string`|
|order|`number`|


#### Wearable

|Property|Type|
|---|---|
|id|`number`|
|type|`Wearable Type`|
|value|`number`|


### Maintainers

This fork is maintained by [Lexogrine](https://lexogrine.com) ([LHM.gg](https://lhm.gg)).

### About

**Lexogrine** is a premier [**Node.js development company**](https://lexogrine.com/technologies/nodejs-development) and AI software development house, delivering high-end AI, web, and mobile design services to a global clientele. In addition to bespoke development, Lexogrine provides a suite of innovative applications, such as [LHM.gg](https://lhm.gg), designed to transform professional collaboration and streamline industry-specific workflows.

Our focus is on next-gen AI development, alongside comprehensive web, mobile, and cloud solutions. We leverage a powerful stack that includes TypeScript, Python, LLMs, React, React Native, Node.js, Prisma, Medusa, PyTorch, AWS, and Google Cloud Platform.

With a 5-year track record and hundreds of projects delivered, Lexogrine helps businesses worldwide drive growth through scalable, future-proof technology.
