import { LpButtonElement } from "./atoms/button.mjs";
import { LpCheckboxElement } from "./atoms/checkbox.mjs";
import { LpRadioElement } from "./atoms/radio.mjs";
import { LpTextFieldElement } from "./atoms/text-field.mjs";
import { registerElement } from "./core/register-element.mjs";
import { LpChoiceGroupElement } from "./molecules/choice-group.mjs";
import { LpColorPickerElement } from "./molecules/color-picker.mjs";
import { LpFilePickerElement } from "./molecules/file-picker.mjs";
import { LpFormElement } from "./molecules/form.mjs";
import { LpSidebarItemElement } from "./organisms/sidebar-item.mjs";
import { LpSidebarSubitemElement } from "./organisms/sidebar-subitem.mjs";
import { LpSidebarElement } from "./organisms/sidebar.mjs";
import { LpLayoutElement } from "./templates/layout.mjs";

registerElement("lp-button", LpButtonElement);
registerElement("lp-text-field", LpTextFieldElement);
registerElement("lp-checkbox", LpCheckboxElement);
registerElement("lp-radio", LpRadioElement);
registerElement("lp-form", LpFormElement);
registerElement("lp-choice-group", LpChoiceGroupElement);
registerElement("lp-color-picker", LpColorPickerElement);
registerElement("lp-file-picker", LpFilePickerElement);
registerElement("lp-sidebar", LpSidebarElement);
registerElement("lp-sidebar-item", LpSidebarItemElement);
registerElement("lp-sidebar-subitem", LpSidebarSubitemElement);
registerElement("lp-layout", LpLayoutElement);

export {
  LpButtonElement,
  LpCheckboxElement,
  LpChoiceGroupElement,
  LpColorPickerElement,
  LpFilePickerElement,
  LpFormElement,
  LpLayoutElement,
  LpRadioElement,
  LpSidebarElement,
  LpSidebarItemElement,
  LpSidebarSubitemElement,
  LpTextFieldElement,
};
