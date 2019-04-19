import { WidgetModel, WidgetView } from "@jupyter-widgets/base";

export class ReactModel extends WidgetModel {
  public widget_manager: any;
  public is_react: boolean = true;

  defaults() {
    return {
      ...super.defaults()
    };
  }

  initialize(attributes: any, options: any) {
    super.initialize(attributes, options);
  }
}

export class ReactView extends WidgetView {
  public model: BoxModel;
  public is_react: boolean = true;

  render() {
    console.log("render box view");
  }
}

export class BoxModel extends ReactModel {}
export class BoxView extends ReactView {}

export class VBoxModel extends ReactModel {}
export class VBoxView extends ReactView {}

export class HBoxModel extends ReactModel {}
export class HBoxView extends ReactView {}

export class AccordianModel extends ReactModel {}
export class AccordianView extends ReactView {}

export class TabModel extends ReactModel {}
export class TabView extends ReactView {}
