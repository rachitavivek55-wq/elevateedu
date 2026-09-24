# Archived systems

ElevateEdu used to be four systems: Planner, Wallet, Wellness and
Mindset. Usage showed that people only really used the Planner, so the
other three were unhooked from the app. **Nothing was deleted.** Every
file is still in this repo exactly as it was, it is just no longer
linked from anywhere, so you can put any of it back without rebuilding
it.

## What is still live

| Tool | Page | Styles | Script |
| --- | --- | --- | --- |
| Calendar | `calendar.html` | `calendar.css` | `calendar.js` |
| Checklists | `checklists.html` | `checklists.css` | `checklists.js` |
| Assignments | `assignments.html` | `assignments.css` | `assignments.js` |
| Gradebook | `gradebook.html` | `gradebook.css` | `gradebook.js`, `gbscores.js` |
| Notes | `notes.html` | `notes.css` | `notes.js` |

## What is archived

### Wallet

Hub page: `wallet.html`

| Tool | Page | Styles | Script |
| --- | --- | --- | --- |
| Balance | `balance.html` | `balance.css` | `balance.js` |
| Wishlist | `wishlist.html` | `wishlist.css` | `wishlist.js` |

### Wellness

Hub page: `wellness.html`

| Tool | Page | Styles | Script |
| --- | --- | --- | --- |
| Workout Planner | `workout.html` | `workout.css` | `workout.js` |
| Meal Planner | `mealplanner.html` | `mealplanner.css` | `mealplanner.js` |
| Body Stats | `bodystats.html` | `bodystats.css` | `bodystats.js` |
| Progress | `progress.html` | `progress.css` | `progress.js` |

### Mindset

Hub page: `mindset.html`

| Tool | Page | Styles | Script |
| --- | --- | --- | --- |
| Mind Dump | `minddump.html` | `minddump.css` | `minddump.js` |
| Vision Board | `visionboard.html` | `visionboard.css` | `visionboard.js` |

### Also unhooked

- `planner.html` - the old Planner hub. Home is the planner
  itself now, so this page is not needed, but it still works if you
  open it directly.
- `focus.*`, `meditation.*`, `lookbest.*` and
  `social.*` were already unlinked before this change.

## Saved data is untouched

Dropping the tabs does not drop anybody's data. These keys are still in
`localStorage` (and in Supabase for signed-in users), so if a system
comes back, everything that was in it comes back with it:

- Wallet: `elevate_balance_state`, `elevate_wishlist`
- Wellness: `elevate_workouts`, `elevate_mealplan`, `elevate_bodystats`
- Mindset: `elevate_minddump`, `elevate_visionboard`

## How to put a system back

Four small edits.

**1. Add the route back in `script.js`.**

Section 3 holds the routing map. Add the hub page to it:

```js
const pages = {
  home: 'index.html',
  // ...
  wallet: 'wallet.html',
};
```

**2. Add the tab back in `script.js`.**

The bottom navigation is built in section 1c. Add an entry to `tabs`:

```js
{ tab: 'wallet', label: 'Wallet', icon: 'wallet', on: ['wallet.html'] },
```

Five tabs already fills the bar on a small phone, so if you go past
five, shorten a label or move one of the current tools down onto the
home grid instead.

**3. Add the tile back in `index.html`.**

Inside `<div class="grid">`:

```html
<article class="tile">
  <span class="tile-icon"><i data-lucide="wallet"></i></span>
  <span class="tile-name">Wallet</span>
  <span class="tile-metric">Open</span>
</article>
```

The tile name is matched against the routing map in lower case, so
`Wallet` opens `wallet.html` on its own. To show a live number
instead of "Open", add a case to `updateHomeMetrics()` in
section 6.

**4. Put the pages back in the offline cache in `sw.js`.**

Add the page, its stylesheet and its script to `CORE`, then bump
the `CACHE` version by one so the new shell is picked up.

## History

- v79 - Wallet, Wellness and Mindset unhooked. Home became the planner
  itself. Calendar and Checklists restyled for readability.
