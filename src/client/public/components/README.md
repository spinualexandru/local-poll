# LocalPoll components

LocalPoll uses autonomous custom elements as light-DOM enhancement wrappers.
Every interactive element stays native, so forms, validation, keyboard
interaction, accessibility semantics, and server-rendered content work before
the component module loads.

Load the system once:

```html
<link rel="stylesheet" href="/components/index.css" />
<script type="module" src="/components/index.mjs"></script>
```

## Elements

### `lp-button`

Wrap exactly one `button` or `a`.

```html
<lp-button variant="primary" size="large" block>
  <button type="submit">Save changes</button>
</lp-button>
```

- `variant`: `primary`, `secondary`, `danger`, or `ghost`
- `appearance="outline"`: outlined secondary presentation
- `size`: `small`, `medium`, or `large`
- `block`: fill the available width
- `busy`: expose a busy state and temporarily disable native buttons

### `lp-text-field`

Wrap a label and native `input` or `textarea`. Optional descriptions use
`data-hint` and `data-error`.

```html
<lp-text-field>
  <label for="email">Email</label>
  <input id="email" name="email" type="email" required />
  <p data-hint>Used for admin sign-in.</p>
</lp-text-field>
```

`invalid` synchronizes `aria-invalid`; `disabled` temporarily disables the
native control. Keep `name`, `value`, `required`, and autocomplete attributes on
the native control.

### `lp-checkbox` and `lp-radio`

Wrap one correctly typed native input and its label.

```html
<lp-checkbox>
  <input id="anonymous" name="anonymous" type="checkbox" />
  <label for="anonymous">Anonymous voting</label>
</lp-checkbox>
```

### `lp-choice-group`

Wrap a native `fieldset` and `legend` containing checkbox or radio elements.
Use `data-error` for a group error and `invalid` when the group is invalid.

### `lp-form`

Wrap exactly one native form. `layout` accepts `stack`, `split`, or `branding`.
The `submitting` state coordinates busy submit buttons without intercepting the
native submit event or changing `FormData`.

### `lp-color-picker`

Wrap a native color input marked `data-color-input` and a text input marked
`data-color-text`. Valid six-digit hex values stay synchronized. Use
`inherit-label` with `inherited` for a named inherited state.

### `lp-file-picker`

Wrap a native file input, an image marked `data-file-preview`, and visible text
marked `data-file-label`. Image selections receive a temporary local preview;
object URLs are revoked when replaced or disconnected.

### Sidebar and layout

`lp-sidebar` wraps a real `aside` and `nav`, with `public` and `admin` variants.
`lp-sidebar-item` and `lp-sidebar-subitem` wrap native anchors or static spans.
Keep `aria-current="page"` on the server-rendered anchor.

`lp-layout` wraps the semantic `main` element and accepts `public`, `landing`,
`admin`, and `auth` variants.

## Events and forms

Components do not create a second event system. Listen for the native `input`,
`change`, `submit`, and click events emitted by their descendants. Read values
from native controls or `FormData`; do not put form names or values on the
custom-element host.

## Accessibility

- Always provide a native label for a form control.
- Use `fieldset` and `legend` for related choices.
- Keep interactive semantics on native buttons and anchors.
- Give icon-only links and buttons an accessible name.
- Preserve visible `:focus-visible` styles and server-rendered `aria-current`.
- Do not add customized built-ins, `is=`, Shadow DOM, or `ElementInternals`.

## Adding a component

1. Choose the smallest atomic tier that matches its responsibility.
2. Extend `LocalPollElement` and keep the constructor free of DOM work.
3. Discover author-provided children in `setup(signal)`.
4. Attach listeners with the supplied abort signal and release external
   resources in `teardown()`.
5. Preserve native elements and events instead of recreating their behavior.
6. Register the class in `index.mjs`, add low-specificity styles, document the
   markup contract, add it to the fixture, and cover pure behavior with tests.
