const Applet = imports.ui.applet;
const GLib = imports.gi.GLib;
const Mainloop = imports.mainloop;
const Lang = imports.lang;

function run(cmd) {
  try {
    let [result, stdout, stderr] = GLib.spawn_command_line_sync(cmd);

    if (stdout !== null) {
      return stdout.toString();
    }
  } catch (e) {
    global.logError(e.message);
  }
}

function getMICStatus() {
  const output = run("amixer -D pulse sget Capture P");

  if (output) {
    const searchStatus = output.match(/(\[off\]|\[on\])/gm);

    if (!searchStatus) {
      return "";
    }

    return searchStatus[0].replace(/\[|\]/g, "");
  }

  throw new Error("Couldn't find current audio device");
}

class MyApplet extends Applet.IconApplet {
  constructor(orientation, panelHeight, instanceId) {
    super(orientation, panelHeight, instanceId);

    this._timeout = null;
    this.updateIcon = this.updateIcon.bind(this);
    this.updateIcon();
    this.set_applet_tooltip(_("Click to mute and unmute the microphone"));
    this._timeout = Mainloop.timeout_add_seconds(
      60,
      Lang.bind(this, this._refresh)
    );
  }

  updateIcon() {
    const status = getMICStatus();
    const micIconName =
      status === "on"
        ? "microphone-sensitivity-high"
        : "microphone-sensitivity-muted";

    this.set_applet_icon_name(micIconName);
  }

  _refresh() {
    global.log("Mic::MyApplet::_refresh");
    this.updateIcon();

    return true;
  }

  on_applet_clicked() {
    const status = getMICStatus();
    const micStatus = status === "on" ? "Mic: mute" : "Mic: unmute";

    global.log("Changing the microphone status");

    GLib.spawn_command_line_async(`amixer -D pulse sset Capture toggle`);
    GLib.spawn_command_line_async(
      `notify-send --hint=int:transient:1 -t 500 '${micStatus}'`
    );

    this.updateIcon();
  }
}

function main(metadata, orientation, panel_height, instance_id) {
  let myApplet = new MyApplet(orientation, panel_height, instance_id);

  return myApplet;
}
