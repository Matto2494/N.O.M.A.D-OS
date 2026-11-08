/*
 * NomadOS: a full-screen campervan command centre for Home Assistant, made for a landscape tablet.
 * Installed by the NomadOS integration, which also stores the answers from the setup wizard.
 * One file runs both pages: panel config `mode: live` reads your entities,
 * `mode: demo` shows example values (for showing off, or before the kit is fitted).
 * Entity ids can be overridden in configuration.yaml under panel_custom > config > entities.
 */
const VCC_VERSION = "2.0.1";

// No built-in entity names: the setup wizard picks them for each van
const VCC_DEFAULT_ENTITIES = {};
const VCC_FALLBACK = {};
// Last resort: find the Victron sensors by name pattern and unit, whatever the integration called them
const VCC_DISCOVER = {
  soc: { re: /^sensor\..*(smartshunt|shunt|bmv|battery_monitor|gx_device_battery).*(state_of_charge|soc|charge)$/, u: ["%"] },
  batt_power: { re: /^sensor\..*(smartshunt|shunt|bmv|gx_device_battery).*power$/, u: ["W", "kW"] },
  batt_voltage: { re: /^sensor\..*(smartshunt|shunt|bmv|gx_device_battery).*voltage/, not: /starter|aux|mid|temperature/, u: ["V"] },
  batt_current: { re: /^sensor\..*(smartshunt|shunt|bmv|gx_device_battery).*current/, u: ["A"] },
  time_to_go: { re: /^sensor\..*(smartshunt|shunt|bmv|gx_device).*time_to_go/ },
  solar: { re: /^sensor\..*((pv|solar).*power|(mppt|smartsolar|solar_charger).*(yield_power|_power))$/, not: /max|limit|today|yesterday/, u: ["W", "kW"] },
  solar_today: { re: /^sensor\..*(mppt|smartsolar|solar|pv).*(yield_today|today)/, u: ["kWh", "Wh"] },
  ac_load: { re: /^sensor\..*((ac_)?consumption.*(l1|power)|ac_loads?(_power)?|output_power_l1)$/, not: /dc|input/, u: ["W", "kW"] },
  dc_load: { re: /^sensor\..*(dc_consumption|dc_system(_power)?|dc_loads?)$/, u: ["W", "kW"] },
  shore_power: { re: /^sensor\..*(multiplus|vebus|inverter|grid|ac_in).*(input|ac_in|grid).*power/, u: ["W", "kW"] },
  shore_voltage: { re: /^sensor\..*(multiplus|vebus|inverter|ac_in).*(input|ac_in).*voltage/, u: ["V"] },
  alternator: { re: /^sensor\..*(orion|alternator|dc_dc|dcdc).*power$/, not: /input/, u: ["W", "kW"] },
  fresh: { re: /^sensor\..*fresh.*(level|tank|water)/, u: ["%"] },
  waste: { re: /^sensor\..*(waste|grey|gray).*(level|tank|water)/, u: ["%"] },
};
const VCC_DEFAULT_PAGES = {};
const VCC_WHEELBASE_MM = 3500, VCC_TRACK_MM = 1700, VCC_SOLAR_WP = 400;

const VCC_CSS = `:host{--page:#0B0B0C;--ground:#0D0E0F;--panel:#151618;--hair:#26282B;--ink:#ECE6DC;--muted:#8E8A83;--tan:#C8A27A;
--amber:#FFB04A;--elec:#A6CF6B;--sun:#E9C46A;--heat:#E8833A;--water:#6FB8C9;--waste:#B89070;
--disp:'Barlow Semi Condensed',Barlow,system-ui,sans-serif;--body:Barlow,system-ui,sans-serif;--mono:'Martian Mono',ui-monospace,Menlo,monospace;--stencil:'Big Shoulders Stencil Display','Barlow Semi Condensed',Impact,sans-serif;--olive:#7D8457;
--brk:linear-gradient(var(--tan),var(--tan)) top left/14px 1px no-repeat,linear-gradient(var(--tan),var(--tan)) top left/1px 14px no-repeat,linear-gradient(var(--tan),var(--tan)) top right/14px 1px no-repeat,linear-gradient(var(--tan),var(--tan)) top right/1px 14px no-repeat,linear-gradient(var(--tan),var(--tan)) bottom left/14px 1px no-repeat,linear-gradient(var(--tan),var(--tan)) bottom left/1px 14px no-repeat,linear-gradient(var(--tan),var(--tan)) bottom right/14px 1px no-repeat,linear-gradient(var(--tan),var(--tan)) bottom right/1px 14px no-repeat;color-scheme:dark}
.scr{width:1280px;height:800px;transform-origin:0 0;position:absolute;left:0;top:0;background:linear-gradient(#C8A27A0A 1px,transparent 1px) 0 0/80px 80px,linear-gradient(90deg,#C8A27A0A 1px,transparent 1px) 0 0/80px 80px,url(__TOPO__) center/cover no-repeat,radial-gradient(90% 90% at 50% 45%,#121410,var(--ground));display:grid;grid-template-rows:58px 1fr 118px;font-variant-numeric:tabular-nums;position:relative}
.lab,.k,.grp h3,.coord,.sn,.pg,.h .t,.dn{font-family:var(--mono);text-transform:uppercase;letter-spacing:.08em}
.bar{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:0 28px;border-bottom:1px solid var(--hair);color:var(--muted);font-size:14px;background:linear-gradient(#0D0E0Ff2,#0D0E0Fb0);backdrop-filter:blur(2px)}
.id{display:flex;gap:14px;align-items:center}
.plate{font-family:var(--stencil);font-weight:800;font-size:19px;letter-spacing:.14em;color:#11120c;background:var(--olive);padding:3px 10px 2px;border-radius:4px;box-shadow:inset 0 0 0 1px #00000040}
.pill{display:flex;gap:7px;align-items:center;font-size:12px;color:#C9C2B6}
.pd{width:7px;height:7px;border-radius:50%;background:var(--elec);box-shadow:0 0 8px var(--elec)}
.loc{display:flex;gap:8px;align-items:center;color:var(--ink)}
.loc svg{width:16px;height:16px;color:var(--tan)}
.coord{font-size:10px;color:var(--muted);margin-left:8px}
.sys{justify-self:end;display:flex;gap:9px;align-items:center;font-size:13px}
.sig{display:inline-flex;gap:2px;align-items:end;height:12px}
.sig i{width:3px;background:var(--ink);border-radius:1px}
.sig i:nth-child(1){height:4px}
.sig i:nth-child(2){height:7px}
.sig i:nth-child(3){height:10px}
.sig i:nth-child(4){height:12px}
.sig i.off{background:#3a3833}
.dot{width:3px;height:3px;border-radius:50%;background:#4d4a44}
.main{display:grid;grid-template-columns:300px 1fr 290px;min-height:0}
.left{padding:18px 24px 0 28px;border-right:1px solid var(--hair);background:linear-gradient(90deg,#0D0E0Fd0,#0D0E0F90);display:grid;align-content:start;gap:12px}
.time{font-family:var(--stencil);font-weight:800;font-size:96px;line-height:.85;letter-spacing:.02em}
.clock{display:grid;grid-template-columns:auto 1fr;column-gap:10px;align-items:start}
.zulu{font-family:var(--stencil);font-weight:800;font-size:18px;letter-spacing:.14em;color:var(--olive);padding-top:4px}
.clock .date{grid-column:1/-1}
.date{display:block;color:var(--tan);font-size:15px;margin-top:6px;letter-spacing:.02em}
.wi{display:inline-block;width:26px;height:26px;color:#CFC8BC}
.wi svg{width:100%;height:100%;display:block}
.now{display:flex;gap:14px;align-items:center}
.big-i{width:50px;height:50px}
.temp{font-family:var(--disp);font-weight:700;font-size:42px;line-height:1}
.temp small{font-size:.55em;color:var(--muted)}
.cond{color:var(--muted);font-size:14px}
.wx-meta{display:flex;gap:16px;color:var(--muted);font-size:13px}
.wx-meta b{color:var(--ink);font-weight:600}
.hours{display:grid;grid-template-columns:repeat(5,1fr);border-block:1px solid var(--hair);padding-block:9px}
.h{display:grid;justify-items:center;gap:3px}
.h .t{font-size:9.5px;color:var(--muted)}
.h .tv{font-family:var(--disp);font-weight:700;font-size:17px}
.h .rp{font-size:11px;color:var(--water)}
.days{display:grid;gap:5px}
.d{display:grid;grid-template-columns:36px 24px 32px 24px 1fr;align-items:center;gap:8px;font-size:14px}
.d .wi{width:20px;height:20px}
.dn{font-size:10.5px;color:var(--muted)}
.hi{font-family:var(--disp);font-weight:700;font-size:16px}
.lo{color:var(--muted)}
.rng{position:relative;height:4px;border-radius:2px;background:#22221f}
.rng i{position:absolute;top:0;bottom:0;border-radius:2px;background:linear-gradient(90deg,var(--water),var(--heat))}
.level{display:grid;grid-template-columns:58px 1fr auto;gap:12px;align-items:center;border-top:1px solid var(--hair);padding-top:12px}
.bub{width:56px;height:56px;border-radius:50%;position:relative;background:radial-gradient(circle,#1b1c1a 0 60%,#121311 100%);box-shadow:inset 0 0 0 1px var(--hair),inset 0 0 0 14px #ffffff05}
.cross{position:absolute;inset:0;background:linear-gradient(var(--hair),var(--hair)) center/1px 100% no-repeat,linear-gradient(var(--hair),var(--hair)) center/100% 1px no-repeat;border-radius:50%}
.cross::after{content:"";position:absolute;inset:18px;border-radius:50%;border:1px solid #3a3a36}
.b{position:absolute;left:21px;top:21px;width:14px;height:14px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#E5F3B8,var(--elec));box-shadow:0 0 10px #A6CF6B80}
.lv{display:grid;gap:2px;font-size:13px;color:var(--muted)}
.lv b{color:var(--ink);font-family:var(--disp);font-size:15px}
.lab{font-size:9.5px;color:var(--tan)}
.cmp{display:grid;justify-items:end;gap:0}
.cmp b{font-family:var(--disp);font-size:24px;line-height:1}
.deg{font-size:11px;color:var(--muted)}
.centre{display:grid;grid-template-rows:1fr auto;padding:0 18px 14px;min-width:0;position:relative}
.stage{position:relative;min-height:0;display:grid;place-items:center}
.stage::before{content:none}
.stage .tag{position:absolute;left:5%;top:4%;z-index:3;font-family:var(--mono);font-size:9.5px;letter-spacing:.12em;color:var(--tan);text-transform:uppercase;display:grid;gap:3px}
.stage .tag b{font-family:var(--stencil);font-weight:800;font-size:22px;letter-spacing:.08em;color:var(--ink)}
.stage::after{content:"";position:absolute;left:14%;right:10%;bottom:7%;height:9%;background:radial-gradient(closest-side,#000c,transparent);z-index:0}
.stage img{position:relative;z-index:1;max-width:84%;max-height:90%;object-fit:contain;display:block;filter:brightness(.62) saturate(.6) contrast(1.05) drop-shadow(0 16px 22px #000c)}
.strip{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));padding:10px 8px 6px;background:var(--brk)}
.stat{display:grid;gap:3px;padding:2px 16px;border-left:1px solid var(--hair);align-content:start}
.stat:first-child{border-left:0;padding-left:6px}
.k{font-family:var(--stencil);font-weight:800;font-size:15px;letter-spacing:.14em;color:var(--tan)}
.big{font-family:var(--disp);font-weight:700;font-size:46px;line-height:1;color:var(--c)}
.big small{font-size:.48em;color:var(--muted);margin-left:2px}
.s{color:var(--muted);font-size:12.5px}
.scale{position:relative;height:12px;margin-top:6px;display:block}
.scale i{position:absolute;bottom:0;width:1px;height:5px;background:#3d3b37}
.scale i.maj{height:9px;background:#5a5650}
.scale .fill{position:absolute;left:0;bottom:0;height:2px;background:var(--c);box-shadow:0 0 6px var(--c)}
.right{padding:14px 28px 0 24px;border-left:1px solid var(--hair);background:linear-gradient(270deg,#0D0E0Fd0,#0D0E0F90);display:grid;align-content:start;gap:11px}
.grp h3{margin:0 0 2px;font-family:var(--stencil);font-weight:800;font-size:17px;letter-spacing:.14em;color:var(--tan);display:flex;gap:10px;align-items:center}
.grp h3::before{content:"";width:6px;height:6px;border-radius:50%;background:var(--c);box-shadow:0 0 6px var(--c)}
.grp h3::after{content:"";flex:1;height:1px;background:linear-gradient(90deg,#4a453d,transparent)}
.row{display:grid;grid-template-columns:1fr auto;align-items:baseline;padding:5px 0;border-top:1px solid var(--hair);font-size:14px;color:var(--muted)}
.row b{font-family:var(--disp);font-weight:700;font-size:19px;color:var(--ink)}
.row b.dim{color:var(--muted);font-weight:600}
.hc{color:var(--heat)!important}
.wc{color:var(--water)!important}
.xc{color:var(--waste)!important}
.row.bar i{grid-column:1/-1;height:5px;border-radius:3px;margin-top:6px;background:linear-gradient(90deg,var(--bc) var(--p),#22221f var(--p))}
.dock{position:relative;display:grid;grid-template-columns:1fr 210px;gap:14px;padding:14px 30px;align-items:stretch;border-top:1px solid #2e2f31;
 background:repeating-linear-gradient(90deg,#ffffff03 0 1px,transparent 1px 3px),linear-gradient(#1b1c1e,#121314)}
.screw{position:absolute;width:9px;height:9px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#55565a,#2a2b2e);box-shadow:inset 0 0 0 1px #0008}
.screw::after{content:"";position:absolute;left:2px;right:2px;top:4px;height:1px;background:#111;transform:rotate(35deg)}
.s1{left:10px;top:10px}
.s2{right:10px;top:10px}
.s3{left:10px;bottom:10px}
.s4{right:10px;bottom:10px}
.sws{display:grid;grid-template-columns:repeat(7,1fr);gap:8px}
.sw{all:unset;box-sizing:border-box;cursor:pointer;display:grid;grid-template-rows:4px 1fr auto auto;justify-items:center;gap:5px;padding:7px 6px 9px;border-radius:9px;
 background:linear-gradient(#202124,#17181a);box-shadow:inset 0 1px 0 #ffffff12,inset 0 -2px 0 #0007,0 2px 4px #0008;font-family:var(--body)}
.sw:focus-visible{outline:2px solid var(--amber);outline-offset:2px}
.led{width:24px;height:8px;border-radius:2px;background:#24231f;box-shadow:inset 0 1px 2px #000c,0 0 0 1px #3a3833}
.si{color:#5f5b55}
.si svg{width:22px;height:22px;display:block}
.sn{font-family:var(--stencil);font-weight:800;font-size:14px;letter-spacing:.12em;color:#7d786f;text-shadow:0 1px 0 #000}
.ss{font-size:11px;color:var(--muted)}
.sw:active{box-shadow:inset 0 2px 4px #000a,inset 0 0 0 1px #26282b;transform:translateY(1px)}
.sw.on .led{background:var(--amber);box-shadow:inset 0 -1px 0 #0004,0 0 0 1px #3a3833}
.sw.on .si,.sw.on .sn{color:var(--tan)}
.sw.on .ss{color:var(--ink)}
.pages{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.pg{display:grid;place-items:center;border-radius:8px;font-size:10px;color:var(--muted);background:#161719;box-shadow:inset 0 0 0 1px var(--hair)}
.pg.on{color:#11120c;background:var(--olive)}
.now{display:grid;grid-template-columns:auto 1fr;gap:4px 14px;align-items:center}
.nexthr{grid-column:1/-1;display:grid;grid-template-columns:1fr auto;gap:10px;align-items:end}
.nexthr .rb{display:flex;align-items:end;gap:2px;height:18px}
.nexthr .rb i{flex:1;background:var(--water);opacity:.75;border-radius:1px 1px 0 0}
.nh{font-size:12px;color:var(--water)}
.warn{font-size:12.5px;color:#16130F;background:var(--sun);border-radius:5px;padding:5px 9px}
.warn b{font-weight:700;margin-right:4px}
.wxt{display:grid;gap:10px}
.tabs{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;border-bottom:1px solid var(--hair);padding-bottom:8px}
.tabs button{all:unset;cursor:pointer;text-align:center;font-family:var(--stencil);font-weight:800;font-size:14px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);padding:4px 0;border-radius:5px}
.tabs button.on{color:#11120c;background:var(--olive)}
.tabs button:focus-visible{outline:2px solid var(--tan)}
.pane{display:none;gap:10px;height:200px;align-content:start}
.pane.on{display:grid}
.bl{display:grid;grid-template-columns:62px 1fr;gap:6px 10px;margin:0;font-size:13.5px}
.bl dt{font:10px var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--tan);padding-top:3px}
.bl dd{margin:0;color:#CFC8BC;line-height:1.35}
.bl b{color:var(--ink);font-family:var(--disp);font-size:15px}
.meta{display:flex;gap:14px;color:var(--muted);font-size:12.5px;flex-wrap:wrap}
.meta b{color:var(--ink);font-weight:600}
.chart{width:100%;height:auto;overflow:visible}
.cl text{font:600 11px var(--disp);fill:var(--ink)}
.hx{display:flex;justify-content:space-between;font:10px var(--mono);color:var(--muted);margin-top:-6px}
.leg{display:flex;gap:14px;font-size:12px;color:var(--muted)}
.leg i{display:inline-block;width:10px;height:3px;margin-right:6px;vertical-align:middle}
.lgt{background:var(--heat)}
.lgr{background:var(--water)}
.duo{display:grid;grid-template-columns:1fr 1fr;gap:6px;align-items:start}
.rose,.sun{display:grid;gap:4px;justify-items:center}
.rose svg{width:112px;height:112px}
.sun svg{width:116px;height:auto;margin-top:14px}
.cp{font:600 9px var(--mono);fill:var(--tan);text-anchor:middle}
.wv{font:700 20px var(--disp);fill:var(--ink);text-anchor:middle}
.wu{font:8px var(--mono);fill:var(--muted);text-anchor:middle}
.sr{display:flex;justify-content:space-between;width:116px;font:600 13px var(--disp)}
.cap{font-size:12px;color:var(--muted);text-align:center}
.rx{display:flex;justify-content:space-between;font:10px var(--mono);color:var(--muted)}
.radar{position:relative;height:160px;border-radius:10px;overflow:hidden;background:#0f1110;border:1px solid var(--hair)}
.blob{position:absolute;border-radius:50%;filter:blur(10px)}
.b1{left:6%;top:30%;width:46%;height:42%;background:radial-gradient(circle,#6FB8C9cc,#6FB8C944 60%,transparent 70%)}
.b2{left:24%;top:38%;width:22%;height:20%;background:radial-gradient(circle,#E9C46Acc,transparent 70%)}
.b3{left:58%;top:8%;width:30%;height:26%;background:radial-gradient(circle,#6FB8C988,transparent 70%)}
.ring{position:absolute;left:50%;top:50%;border:1px dashed #C8A27A55;border-radius:50%;transform:translate(-50%,-50%)}
.rg1{width:70px;height:70px}
.rg2{width:150px;height:150px}
.you{position:absolute;left:50%;top:50%;width:10px;height:10px;margin:-5px;border-radius:50%;background:var(--tan);box-shadow:0 0 0 3px #0D0E0F}
.rl{position:absolute;left:calc(50% + 40px);top:calc(50% - 8px);font:9px var(--mono);color:var(--tan)}
.rt{position:absolute;left:10px;bottom:8px;font:9px var(--mono);color:var(--muted);text-transform:uppercase;letter-spacing:.08em}
.scrub{display:flex;gap:4px}
.scrub i{flex:1;height:5px;border-radius:3px;background:#2a2a27}
.scrub i.on{background:var(--tan)}
.level{cursor:pointer;position:relative;border-radius:8px}
.level:focus-visible{outline:2px solid var(--tan);outline-offset:4px}
.open{position:absolute;right:0;bottom:-14px;font:9px var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--olive)}
.lvlf[hidden]{display:none}
.lvlf{position:absolute;inset:0;z-index:20;background:inherit;display:grid;grid-template-rows:64px 1fr}
.lh{display:flex;align-items:center;gap:18px;padding:0 32px;border-bottom:1px solid var(--hair)}
.lt2{font-family:var(--stencil);font-weight:800;font-size:30px;letter-spacing:.16em;text-transform:uppercase}
.lstat{font:600 12px var(--mono);letter-spacing:.1em;text-transform:uppercase;padding:5px 12px;border-radius:5px;background:#2a2620;color:var(--sun)}
.lstat.ok{background:var(--olive);color:#11120c}
.lx{all:unset;margin-left:auto;cursor:pointer;font-family:var(--stencil);font-weight:800;font-size:16px;letter-spacing:.14em;text-transform:uppercase;padding:9px 18px;border-radius:8px;background:linear-gradient(#202124,#17181a);box-shadow:inset 0 1px 0 #ffffff12,0 2px 4px #0008;color:#BDB6AA}
.lbody{display:grid;grid-template-columns:440px 1fr 300px;gap:28px;padding:26px 32px;align-items:center}
.bigbub{position:relative;width:420px;height:420px;border-radius:50%;background:radial-gradient(circle,#191a17 0 58%,#111210 100%);box-shadow:inset 0 0 0 2px var(--hair),inset 0 0 40px #000,0 0 0 10px #151618,0 0 0 11px #2e2f31}
.ring1,.ring2{position:absolute;left:50%;top:50%;border-radius:50%;transform:translate(-50%,-50%);border:1px solid #3a3833}
.ring1{width:60px;height:60px;border-color:var(--olive);border-width:2px}
.ring2{width:220px;height:220px}
.ax{position:absolute;background:#2a2b28}
.ax1{left:50%;top:6%;bottom:6%;width:1px}
.ax2{top:50%;left:6%;right:6%;height:1px}
.bb{position:absolute;left:50%;top:50%;width:46px;height:46px;margin:-23px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#F2F7D8,#A6CF6B 55%,#6d8f3d);box-shadow:0 4px 10px #000a}
.tick{position:absolute;font:10px var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--tan)}
.tn{top:14px;left:50%;transform:translateX(-50%)}
.tb{bottom:14px;left:50%;transform:translateX(-50%)}
.tl{left:14px;top:50%;transform:translateY(-50%)}
.tr{right:14px;top:50%;transform:translateY(-50%)}
.views{display:grid;gap:22px}
.view{display:grid;grid-template-columns:1fr auto;gap:4px 12px;align-items:end}
.view .lab{grid-column:1/-1}
.view svg{grid-column:1/-1;width:100%;height:auto;max-height:150px;overflow:visible}
.ang{display:flex;gap:10px;align-items:baseline}
.ang b{font-family:var(--disp);font-weight:700;font-size:52px;line-height:1}
.ang span{color:var(--muted);font-size:16px}
.vt{font:9px var(--mono);fill:var(--muted);letter-spacing:.1em}
#gSide{transform-origin:130px 112px}
#gRear{transform-origin:100px 132px}
.ramps{display:grid;gap:12px;align-content:center}
.wheels{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.wh{display:grid;gap:2px;padding:12px;border-radius:10px;background:#141517;box-shadow:inset 0 0 0 1px var(--hair)}
.wh span{font-size:13px;color:var(--muted)}
.wh b{font-family:var(--disp);font-size:30px;line-height:1}
.wh.up b{color:var(--sun)}
.wh.zero b{color:#5f5b55}
.hint{margin:0;font-size:13px;color:var(--muted);line-height:1.45}
.lbtn{display:grid;gap:8px}
.lbtn button{all:unset;cursor:pointer;text-align:center;font-family:var(--stencil);font-weight:800;font-size:15px;letter-spacing:.12em;text-transform:uppercase;padding:12px;border-radius:9px;background:linear-gradient(#202124,#17181a);box-shadow:inset 0 1px 0 #ffffff12,inset 0 -2px 0 #0007,0 2px 4px #0008;color:#BDB6AA}
.lbtn button:focus-visible,.lx:focus-visible{outline:2px solid var(--tan);outline-offset:2px}
button.pg{all:unset;cursor:pointer;display:grid;place-items:center;border-radius:8px;font-family:var(--mono);font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);background:#161719;box-shadow:inset 0 0 0 1px var(--hair)}
button.pg:focus-visible{outline:2px solid var(--tan)}
.seg{display:flex;gap:4px;margin-left:10px}
.seg button{all:unset;cursor:pointer;font:500 11px var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--muted);padding:6px 12px;border-radius:6px;box-shadow:inset 0 0 0 1px var(--hair)}
.seg button.on{background:var(--olive);color:#11120c;box-shadow:none}
.cseg{margin-left:0}.cseg button{padding:4px 9px;font-size:10px}
#socLeg{margin-left:auto}
.cnow{font:600 9px var(--mono);fill:var(--ink);text-anchor:middle}
.cmsg{font:600 10px var(--mono);letter-spacing:.06em;text-transform:uppercase}
.obd{display:flex;gap:7px;align-items:center;margin-left:auto;font-size:13px;color:var(--muted)}
.obd .pd{background:var(--muted);box-shadow:none}
.trp .lx{margin-left:16px}
.tbody{display:grid;gap:14px;padding:16px 32px 20px;grid-template-rows:auto auto 1fr;min-height:0}
.kps{display:grid;grid-template-columns:repeat(5,1fr)}
.kp{display:grid;gap:2px;padding:0 18px;border-left:1px solid var(--hair)}
.kp:first-child{border-left:0;padding-left:0}
.kp b{font-family:var(--disp);font-weight:700;font-size:36px;line-height:1.05}
.ks{font-size:12.5px;color:var(--muted)}
.tg2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.tg3{display:grid;grid-template-columns:1fr 330px;gap:16px;min-height:0;align-items:start}
.tp{background:#0f1011d9;border:1px solid var(--hair);border-radius:12px;padding:12px 16px;display:grid;gap:6px;align-content:start;min-width:0}
.tph{display:flex;justify-content:space-between;align-items:baseline;gap:10px}
.fnow{font-size:13px;color:var(--muted)}
.fnow b{font-family:var(--disp);font-size:20px;color:var(--sun);margin-right:4px}
.tc{width:100%;height:auto;display:block}
.cv{font:600 10px var(--disp);fill:#BDB6AA;text-anchor:middle}
.ca{font:9px var(--mono);fill:var(--muted);text-anchor:end}
.cfu{font:9px var(--mono);fill:var(--muted)}
.ca2{font:9px var(--mono);fill:var(--muted)}
.cav{font:9px var(--mono);fill:var(--olive);text-anchor:end}
.tt{width:100%;border-collapse:collapse;font-size:13.5px;font-variant-numeric:tabular-nums}
.tt th{font:9.5px var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--tan);text-align:left;font-weight:400;padding:4px 0}
.tt td{padding:6px 0;border-top:1px solid var(--hair);color:#CFC8BC}
.tt .n{text-align:right}
.tt td:first-child{color:var(--muted);width:118px}
.ar{color:var(--tan)}
.er{display:grid;grid-template-columns:1fr auto;padding:5px 0;border-top:1px solid var(--hair);font-size:13.5px;color:var(--muted)}
.er b{font-family:var(--disp);font-size:17px;color:var(--ink)}
.okc{color:var(--elec)!important}
.trg{cursor:pointer;border-radius:6px}
.trg:focus-visible{outline:2px solid var(--tan);outline-offset:4px}
.sc{color:var(--sun)!important}
.row.sub{border-top:0;padding-top:0;font-size:12.5px}
.row.sub span:last-child{color:var(--muted)}
.sw{transition:background .2s}
.led{transition:background .2s,box-shadow .2s}`;
// Pictures are built in so the whole page is one file
const VCC_VAN = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9Ii0yMCAtMTAgOTM0IDQ0NSI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJoQm9keSIgeDE9IjAiIHkxPSIwIiB4Mj0iMCIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iIzZhNmU3NCIvPjxzdG9wIG9mZnNldD0iLjU1IiBzdG9wLWNvbG9yPSIjNTU1OTVmIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjM2Y0MjQ3Ii8+PC9saW5lYXJHcmFkaWVudD4KPGxpbmVhckdyYWRpZW50IGlkPSJoR2xhc3MiIHgxPSIwIiB5MT0iMCIgeDI9IjEiIHkyPSIxIj48c3RvcCBvZmZzZXQ9IjAiIHN0b3AtY29sb3I9IiMyYTMwMzYiLz48c3RvcCBvZmZzZXQ9Ii41IiBzdG9wLWNvbG9yPSIjMTQxODFjIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjMWQyMzI4Ii8+PC9saW5lYXJHcmFkaWVudD4KPHJhZGlhbEdyYWRpZW50IGlkPSJoUmltIiBjeD0iLjQiIGN5PSIuMzUiIHI9Ii44Ij48c3RvcCBvZmZzZXQ9IjAiIHN0b3AtY29sb3I9IiM4YThlOTQiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiM0ZDUxNTYiLz48L3JhZGlhbEdyYWRpZW50PjwvZGVmcz48ZWxsaXBzZSBjeD0iNDU1IiBjeT0iNDE4IiByeD0iNDIwIiByeT0iOSIgZmlsbD0iIzAwMCIgb3BhY2l0eT0iLjQ1Ii8+CjxnIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzJjMmUzMSIgc3Ryb2tlLXdpZHRoPSI1IiBzdHJva2UtbGluZWNhcD0icm91bmQiPjxwYXRoIGQ9Ik0xMTAsNDAgVjMwIE0zMDAsNDAgVjMwIE00OTAsNDAgVjMwIi8+PHBhdGggZD0iTTk2LDMwIEg1MjAiIHN0cm9rZT0iIzNhM2M0MCIvPjwvZz4KPHBhdGggZD0iTTQ4LDU4IFE0OCw0MCA2OCw0MCBMNjEyLDQwIFE2NTAsNDEgNjc2LDcwIEw4MDAsMjI4IFE4NDIsMjM2IDg2MCwyNTQgUTg3MCwyNjggODcwLDMwMCBMODcwLDM1MCBRODcwLDM2NCA4NTQsMzY0IEw3NjYsMzY0IEE2Niw2NiAwIDAgMCA2MzQsMzY0IEwyOTgsMzY0IEE2Niw2NiAwIDAgMCAxNjYsMzY0IEw2MiwzNjQgUTQ2LDM2NCA0NiwzNDggWiIgZmlsbD0idXJsKCNoQm9keSkiIHN0cm9rZT0iIzJhMmMyZiIgc3Ryb2tlLXdpZHRoPSIzIi8+CjxwYXRoIGQ9Ik01MCwzMTggSDg2NiBWMzUwIFE4NjYsMzYyIDg1MiwzNjIgTDc2NiwzNjIgQTY2LDY2IDAgMCAwIDYzNCwzNjIgTDI5OCwzNjIgQTY2LDY2IDAgMCAwIDE2NiwzNjIgTDYyLDM2MiBRNTAsMzYyIDUwLDM1MCBaIiBmaWxsPSIjMmYzMTM1Ii8+CjxwYXRoIGQ9Ik01MiwyMjYgSDg1OCIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utb3BhY2l0eT0iLjA4IiBzdHJva2Utd2lkdGg9IjIiLz4KPHBhdGggZD0iTTY4OCw4NCBMNzk2LDIyNiBMNzc0LDIyOSBMNjc2LDk4IFoiIGZpbGw9InVybCgjaEdsYXNzKSIvPgo8cGF0aCBkPSJNNjQwLDk2IEg2NzYgTDc2MCwyMTQgUTc2MiwyMjAgNzU0LDIyMCBINjQwIFE2MzQsMjIwIDYzNCwyMTQgVjEwMiBRNjM0LDk2IDY0MCw5NiBaIiBmaWxsPSJ1cmwoI2hHbGFzcykiIHN0cm9rZT0iIzJhMmMyZiIgc3Ryb2tlLXdpZHRoPSIyIi8+CjxyZWN0IHg9IjMzMCIgeT0iMTA0IiB3aWR0aD0iMTkwIiBoZWlnaHQ9IjcyIiByeD0iMTAiIGZpbGw9InVybCgjaEdsYXNzKSIgc3Ryb2tlPSIjMmEyYzJmIiBzdHJva2Utd2lkdGg9IjIiLz4KPHJlY3QgeD0iMTA0IiB5PSIxMDgiIHdpZHRoPSIxMjgiIGhlaWdodD0iNjIiIHJ4PSI5IiBmaWxsPSJ1cmwoI2hHbGFzcykiIHN0cm9rZT0iIzJhMmMyZiIgc3Ryb2tlLXdpZHRoPSIyIi8+CjxwYXRoIGQ9Ik01NDgsNDggVjMxMiBNNjI4LDkyIFYzMTIiIHN0cm9rZT0iIzJhMmMyZiIgc3Ryb2tlLXdpZHRoPSIyLjUiLz48cmVjdCB4PSI1NTYiIHk9IjIzNiIgd2lkdGg9IjI0IiBoZWlnaHQ9IjciIHJ4PSIzIiBmaWxsPSIjMmEyYzJmIi8+PHJlY3QgeD0iNjM4IiB5PSIyMzYiIHdpZHRoPSIyNCIgaGVpZ2h0PSI3IiByeD0iMyIgZmlsbD0iIzJhMmMyZiIvPgo8cGF0aCBkPSJNNzA0LDE2NiBoMTggcTYsMCA2LDYgdjI0IHEwLDYgLTYsNiBoLTE4IHoiIGZpbGw9IiMyYTJjMmYiLz4KPHBhdGggZD0iTTgzOCwyNTggTDg2OCwyNjYgTDg2OCwyODggTDg0MCwyODIgWiIgZmlsbD0iI2Q5ZDRjYyIgb3BhY2l0eT0iLjkiLz48cmVjdCB4PSI4NTIiIHk9IjMwMCIgd2lkdGg9IjE2IiBoZWlnaHQ9IjE0IiByeD0iMyIgZmlsbD0iI0U4ODMzQSIgb3BhY2l0eT0iLjg1Ii8+CjxyZWN0IHg9IjQ2IiB5PSIyNDQiIHdpZHRoPSIxMSIgaGVpZ2h0PSI1OCIgcng9IjMiIGZpbGw9IiNiODQzMmYiLz4KPHBhdGggZD0iTTE2NiwzNjQgQTY2LDY2IDAgMCAxIDI5OCwzNjQgTTYzNCwzNjQgQTY2LDY2IDAgMCAxIDc2NiwzNjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzFkMWYyMiIgc3Ryb2tlLXdpZHRoPSI2Ii8+CjxjaXJjbGUgY3g9IjIzMiIgY3k9IjM2OCIgcj0iNTIiIGZpbGw9IiMxMjEzMTQiLz48Y2lyY2xlIGN4PSIyMzIiIGN5PSIzNjgiIHI9IjQ3IiBmaWxsPSJub25lIiBzdHJva2U9IiMxZjIxMjQiIHN0cm9rZS13aWR0aD0iMyIvPjxjaXJjbGUgY3g9IjIzMiIgY3k9IjM2OCIgcj0iMzEiIGZpbGw9InVybCgjaFJpbSkiLz48Y2lyY2xlIGN4PSIyMzIiIGN5PSIzNjgiIHI9IjMxIiBmaWxsPSJub25lIiBzdHJva2U9IiMyYTJjMzAiIHN0cm9rZS13aWR0aD0iMiIvPjxjaXJjbGUgY3g9IjIzMiIgY3k9IjM2OCIgcj0iMTEiIGZpbGw9IiMyYjJkMzEiLz48Y2lyY2xlIGN4PSIyNTEuMCIgY3k9IjM2OC4wIiByPSIzLjQiIGZpbGw9IiMxZDFmMjIiLz48Y2lyY2xlIGN4PSIyMzcuODcxOTkyNTkxOTc0MDgiIGN5PSIzODYuMDY5ODU2MTk3NTQwNzMiIHI9IjMuNCIgZmlsbD0iIzFkMWYyMiIvPjxjaXJjbGUgY3g9IjIxNi42Mjk1MDQ5NDczODkzIiBjeT0iMzc5LjE2OTA1OTEyOTQ3MzMiIHI9IjMuNCIgZmlsbD0iIzFkMWYyMiIvPjxjaXJjbGUgY3g9IjIxNi42Mjc0MzU1MDQ0NTcwNSIgY3k9IjM1Ni44MzM3ODkzMjUzNjMyIiByPSIzLjQiIGZpbGw9IiMxZDFmMjIiLz48Y2lyY2xlIGN4PSIyMzcuODY4NjQ0MDE3MDg3MyIgY3k9IjM0OS45MjkwNTU5OTAzMjc4NyIgcj0iMy40IiBmaWxsPSIjMWQxZjIyIi8+PGNpcmNsZSBjeD0iNzAwIiBjeT0iMzY4IiByPSI1MiIgZmlsbD0iIzEyMTMxNCIvPjxjaXJjbGUgY3g9IjcwMCIgY3k9IjM2OCIgcj0iNDciIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzFmMjEyNCIgc3Ryb2tlLXdpZHRoPSIzIi8+PGNpcmNsZSBjeD0iNzAwIiBjeT0iMzY4IiByPSIzMSIgZmlsbD0idXJsKCNoUmltKSIvPjxjaXJjbGUgY3g9IjcwMCIgY3k9IjM2OCIgcj0iMzEiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzJhMmMzMCIgc3Ryb2tlLXdpZHRoPSIyIi8+PGNpcmNsZSBjeD0iNzAwIiBjeT0iMzY4IiByPSIxMSIgZmlsbD0iIzJiMmQzMSIvPjxjaXJjbGUgY3g9IjcxOS4wIiBjeT0iMzY4LjAiIHI9IjMuNCIgZmlsbD0iIzFkMWYyMiIvPjxjaXJjbGUgY3g9IjcwNS44NzE5OTI1OTE5NzQiIGN5PSIzODYuMDY5ODU2MTk3NTQwNzMiIHI9IjMuNCIgZmlsbD0iIzFkMWYyMiIvPjxjaXJjbGUgY3g9IjY4NC42Mjk1MDQ5NDczODk0IiBjeT0iMzc5LjE2OTA1OTEyOTQ3MzMiIHI9IjMuNCIgZmlsbD0iIzFkMWYyMiIvPjxjaXJjbGUgY3g9IjY4NC42Mjc0MzU1MDQ0NTciIGN5PSIzNTYuODMzNzg5MzI1MzYzMiIgcj0iMy40IiBmaWxsPSIjMWQxZjIyIi8+PGNpcmNsZSBjeD0iNzA1Ljg2ODY0NDAxNzA4NzMiIGN5PSIzNDkuOTI5MDU1OTkwMzI3ODciIHI9IjMuNCIgZmlsbD0iIzFkMWYyMiIvPjwvc3ZnPg==";
const VCC_TOPO = "data:image/webp;base64,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snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfasAAD+/7KI//+tvxz+a38/87VsfYSbIAHBaAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==";

/* ---------- small helpers ---------- */
const $esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : null; };
const fmt = (v, d = 0) => (v == null ? "—" : v.toFixed(d));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pad2 = (n) => String(n).padStart(2, "0");
const DIRS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
const compass = (deg) => DIRS[Math.round(((deg % 360) + 360) % 360 / 22.5) % 16];
const COMPASS8 = (deg) => ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(((deg % 360) + 360) % 360 / 45) % 8];


/* ---------- heating schedule and fuses (v1.6) ---------- */
const VCC_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const VCC_DAY3 = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const slotOf = (t) => { const [h, m] = String(t).split(":").map(Number); return clamp(Math.round(((h || 0) * 60 + (m || 0)) / 30), 0, 48); };
const timeOf = (s) => (s >= 48 ? "24:00:00" : `${pad2(Math.floor(s / 2))}:${s % 2 ? "30" : "00"}:00`);
const hm = (s) => (s >= 48 ? "24:00" : `${pad2(Math.floor(s / 2))}:${s % 2 ? "30" : "00"}`);
const blocksToSlots = (blocks) => { const a = Array(48).fill(false); (blocks || []).forEach((b) => { for (let s = slotOf(b.from); s < slotOf(b.to); s++) a[s] = true; }); return a; };
const slotsToBlocks = (a) => { const out = []; let s = 0; while (s < 48) { if (a[s]) { let e = s; while (e < 48 && a[e]) e++; out.push({ from: timeOf(s), to: timeOf(e) }); s = e; } else s++; } return out; };
// Blade fuses are coloured by rating, like the real thing
const BLADE_COL = { 1: "#2a2a2a", 2: "#8E8A83", 3: "#8b5fbf", 4: "#e6b8d0", 5: "#c8a27a", 7.5: "#8a5a3c", 10: "#c9483b", 15: "#3f78c9", 20: "#e9c46a", 25: "#d9d4cc", 30: "#6faf5a", 35: "#7b4fa0", 40: "#d9822b" };
function fuseSvg(style, col, blown) {
  const crack = blown ? '<path d="M30 4l8 11-6 4 9 12" fill="none" stroke="var(--heat)" stroke-width="2.6" stroke-linejoin="round"/>' : "";
  if (style === "blade") return `<svg viewBox="0 0 32 44" aria-hidden="true"><rect x="8" y="22" width="5" height="19" rx="1" fill="#9a958c"/><rect x="19" y="22" width="5" height="19" rx="1" fill="#9a958c"/><rect x="3" y="2" width="26" height="22" rx="4" fill="${col}" fill-opacity=".9" stroke="#0007"/><path d="M9 13h4l2-4 2 8 2-4h4" fill="none" stroke="#0009" stroke-width="1.6" stroke-linejoin="round"/>${blown ? '<path d="M5 5l22 16" stroke="var(--heat)" stroke-width="2.6"/>' : ""}</svg>`;
  return `<svg viewBox="0 0 84 34" aria-hidden="true"><rect x="2" y="11" width="80" height="12" rx="2" fill="#8e897f"/><circle cx="10" cy="17" r="3.4" fill="#141517"/><circle cx="74" cy="17" r="3.4" fill="#141517"/><rect x="22" y="3" width="40" height="28" rx="4" fill="${col}" stroke="#0007"/><rect x="28" y="12" width="28" height="10" rx="2" fill="#C8A27A33"/>${crack}</svg>`;
}
function demoSchedule() {
  const wd = blocksToSlots([{ from: "06:30", to: "08:30" }, { from: "17:00", to: "22:30" }]), we = blocksToSlots([{ from: "08:00", to: "11:00" }, { from: "16:00", to: "23:00" }]);
  return VCC_DAYS.map((_, i) => [...(i < 5 ? wd : we)]);
}
function demoFuses() {
  const f = (id, name, group, style, rating, order, check, detail) => ({ id: `binary_sensor.nomados_fuse_${id}`, name, group, style, rating, order, check, detail, state: "ok" });
  return [
    f("inverter", "Inverter", "Main fuses", "mega", "300 A", 1, "Victron", "Inverter sees 13.3 V, battery 13.4 V"),
    f("solar_charger", "Solar charger", "Main fuses", "mega", "60 A", 2, "Victron", "Solar charger sees 13.4 V, battery 13.4 V"),
    f("alternator", "Alternator charger", "Main fuses", "mega", "60 A", 3, "Victron", "Alternator charger sees 13.4 V, battery 13.4 V"),
    f("box_feed", "Fuse box feed", "Main fuses", "mega", "100 A", 4, "Sense wire", "Power reaching the fuse box"),
    f("lights", "Lights", "Fuse box", "blade", "10 A", 10, "Sense wire", "Power after the fuse"),
    f("water_pump", "Water pump", "Fuse box", "blade", "15 A", 11, "Sense wire", "Power after the fuse"),
    f("fridge", "Fridge", "Fuse box", "blade", "15 A", 12, "Sense wire", "Power after the fuse"),
    f("diesel_heater", "Diesel heater", "Fuse box", "blade", "20 A", 13, "Sense wire", "Power after the fuse"),
    f("hot_water", "Hot water (12 V)", "Fuse box", "blade", "25 A", 14, "Sense wire", "Power after the fuse"),
    f("usb_sockets", "USB sockets", "Fuse box", "blade", "10 A", 15, "Sense wire", "Power after the fuse"),
    f("circuit_8", "Circuit 8", "Fuse box", "blade", "5 A", 16, "Sense wire", "Power after the fuse"),
  ];
}

const ICON = {
  rain: '<svg viewBox="0 0 48 48"><path stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none" d="M14 30h20a8 8 0 0 0 0-16 11 11 0 0 0-21 3 6.5 6.5 0 0 0 1 13z"/><path d="M18 35l-2 5M25 35l-2 5M32 35l-2 5" stroke="var(--water)" stroke-width="2.2" stroke-linecap="round"/></svg>',
  cloud: '<svg viewBox="0 0 48 48"><path stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none" d="M14 34h20a8 8 0 0 0 0-16 11 11 0 0 0-21 3 6.5 6.5 0 0 0 1 13z"/></svg>',
  sun: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="8" fill="none" stroke="var(--heat)" stroke-width="2.2"/><path d="M24 6v5M24 37v5M6 24h5M37 24h5M11 11l3.5 3.5M33.5 33.5L37 37M11 37l3.5-3.5M33.5 14.5L37 11" stroke="var(--heat)" stroke-width="2.2" stroke-linecap="round"/></svg>',
  part: '<svg viewBox="0 0 48 48"><circle cx="18" cy="17" r="6" fill="none" stroke="var(--heat)" stroke-width="2.2"/><path d="M18 5v3M7 17H4M9.5 8.5l2 2M26.5 8.5l-2 2" stroke="var(--heat)" stroke-width="2.2" stroke-linecap="round"/><path fill="var(--ground)" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" d="M17 38h18a7 7 0 0 0 0-14 9.5 9.5 0 0 0-18 2.5 5.8 5.8 0 0 0 0 11.5z"/></svg>',
  snow: '<svg viewBox="0 0 48 48"><path stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none" d="M14 30h20a8 8 0 0 0 0-16 11 11 0 0 0-21 3 6.5 6.5 0 0 0 1 13z"/><path d="M18 36v4M16 38h4M30 36v4M28 38h4M24 40v4M22 42h4" stroke="var(--ink)" stroke-width="1.8" stroke-linecap="round"/></svg>',
  fog: '<svg viewBox="0 0 48 48"><path d="M8 20h32M6 27h36M10 34h28" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  storm: '<svg viewBox="0 0 48 48"><path stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none" d="M14 28h20a8 8 0 0 0 0-16 11 11 0 0 0-21 3 6.5 6.5 0 0 0 1 13z"/><path d="M25 30l-4 7h6l-4 7" stroke="var(--sun)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>',
};
// WMO weather codes (Open-Meteo) to icon and words
function wmo(code, isDay = true) {
  const c = Number(code);
  if (c === 0) return [isDay ? "sun" : "cloud", "Clear"];
  if (c <= 2) return ["part", c === 1 ? "Mostly clear" : "Partly cloudy"];
  if (c === 3) return ["cloud", "Cloudy"];
  if (c === 45 || c === 48) return ["fog", "Fog"];
  if (c >= 51 && c <= 57) return ["rain", "Drizzle"];
  if (c >= 61 && c <= 67) return ["rain", c <= 61 ? "Light rain" : c <= 63 ? "Rain" : "Heavy rain"];
  if (c >= 71 && c <= 77) return ["snow", "Snow"];
  if (c >= 80 && c <= 82) return ["rain", "Showers"];
  if (c >= 85 && c <= 86) return ["snow", "Snow showers"];
  if (c >= 95) return ["storm", "Thunder"];
  return ["cloud", "Cloudy"];
}

/* WGS84 lat/lon to an Ordnance Survey grid reference (6 figures), e.g. "NY 266 234". */
function osGridRef(lat, lon) {
  const toRad = Math.PI / 180;
  // WGS84 -> OSGB36 (Helmert)
  const a1 = 6378137, b1 = 6356752.3142, e21 = 1 - (b1 * b1) / (a1 * a1);
  let phi = lat * toRad, lam = lon * toRad;
  let nu = a1 / Math.sqrt(1 - e21 * Math.sin(phi) ** 2);
  let x1 = nu * Math.cos(phi) * Math.cos(lam), y1 = nu * Math.cos(phi) * Math.sin(lam), z1 = (1 - e21) * nu * Math.sin(phi);
  const tx = -446.448, ty = 125.157, tz = -542.06, s = 20.4894e-6, rx = (-0.1502 / 3600) * toRad, ry = (-0.247 / 3600) * toRad, rz = (-0.8421 / 3600) * toRad;
  const x2 = tx + (1 + s) * x1 - rz * y1 + ry * z1, y2 = ty + rz * x1 + (1 + s) * y1 - rx * z1, z2 = tz - ry * x1 + rx * y1 + (1 + s) * z1;
  const a = 6377563.396, b = 6356256.909, e2 = 1 - (b * b) / (a * a);
  const p = Math.hypot(x2, y2);
  phi = Math.atan2(z2, p * (1 - e2));
  for (let i = 0; i < 10; i++) { nu = a / Math.sqrt(1 - e2 * Math.sin(phi) ** 2); phi = Math.atan2(z2 + e2 * nu * Math.sin(phi), p); }
  lam = Math.atan2(y2, x2);
  // OSGB36 lat/lon -> eastings/northings
  const F0 = 0.9996012717, phi0 = 49 * toRad, lam0 = -2 * toRad, N0 = -100000, E0 = 400000, n = (a - b) / (a + b);
  const sin = Math.sin(phi), cos = Math.cos(phi), tan = Math.tan(phi);
  nu = a * F0 / Math.sqrt(1 - e2 * sin * sin);
  const rho = a * F0 * (1 - e2) / Math.pow(1 - e2 * sin * sin, 1.5), eta2 = nu / rho - 1;
  const dp = phi - phi0, sp = phi + phi0;
  const M = b * F0 * ((1 + n + 1.25 * n * n + 1.25 * n ** 3) * dp - (3 * n + 3 * n * n + 2.625 * n ** 3) * Math.sin(dp) * Math.cos(sp)
    + (1.875 * n * n + 1.875 * n ** 3) * Math.sin(2 * dp) * Math.cos(2 * sp) - (35 / 24) * n ** 3 * Math.sin(3 * dp) * Math.cos(3 * sp));
  const I = M + N0, II = (nu / 2) * sin * cos, III = (nu / 24) * sin * cos ** 3 * (5 - tan * tan + 9 * eta2), IIIA = (nu / 720) * sin * cos ** 5 * (61 - 58 * tan * tan + tan ** 4);
  const IV = nu * cos, V = (nu / 6) * cos ** 3 * (nu / rho - tan * tan), VI = (nu / 120) * cos ** 5 * (5 - 18 * tan * tan + tan ** 4 + 14 * eta2 - 58 * tan * tan * eta2);
  const dl = lam - lam0;
  const N = I + II * dl ** 2 + III * dl ** 4 + IIIA * dl ** 6, E = E0 + IV * dl + V * dl ** 3 + VI * dl ** 5;
  if (!(E >= 0 && E < 700000 && N >= 0 && N < 1300000)) return null; // outside GB
  const e100k = Math.floor(E / 100000), n100k = Math.floor(N / 100000);
  let l1 = (19 - n100k) - (19 - n100k) % 5 + Math.floor((e100k + 10) / 5);
  let l2 = ((19 - n100k) * 5) % 25 + (e100k % 5);
  if (l1 > 7) l1++; if (l2 > 7) l2++;
  const letters = String.fromCharCode(l1 + 65) + String.fromCharCode(l2 + 65);
  const e = Math.floor((E % 100000) / 100), nn = Math.floor((N % 100000) / 100);
  return `${letters} ${String(e).padStart(3, "0")} ${String(nn).padStart(3, "0")}`;
}

/* ---------- static markup ---------- */
const P = (d) => `<svg viewBox="0 0 24 24"><path d="${d}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const SWITCHES = [
  ["sw_heater", "Heater", P("M12 3c3 4 5 6 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-5 .5 2 1.5 3 3 3 0-3-1-5 0-8z")],
  ["sw_hot_water", "Hot water", P("M7 21h10M8 3h8v14H8zM10 7h4")],
  ["sw_pump", "Pump", P("M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z")],
  ["inverter_mode", "Inverter", P("M3 12c2-5 4-5 6 0s4 5 6 0 4-5 6 0")],
  ["sw_lights", "Lights", P("M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z")],
  ["sw_awning", "Awning light", P("M3 8l9-4 9 4M5 8v3M19 8v3M3 8h18M12 12v3M9 18l-1 2M15 18l1 2M12 18v3")],
  ["sw_night", "Night", P("M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z")],
];
const TICKS = Array.from({ length: 21 }, (_, i) => `<i style="left:${i * 5}%"${i % 5 === 0 ? ' class="maj"' : ""}></i>`).join("");
const scale = (id) => `<span class="scale"><span class="fill" id="${id}"></span>${TICKS}</span>`;
const row = (label, id, cls = "") => `<div class="row" data-more="${id}"><span>${label}</span><b id="v_${id}" class="${cls}">—</b></div>`;

const SIDE_VAN = `<svg viewBox="0 0 894 452" class="vs"><g id="gSide"><line x1="-120" y1="422" x2="1014" y2="422" stroke="#3a3833" stroke-width="3"/><g><defs><linearGradient id="lsBody" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6a6e74"/><stop offset=".55" stop-color="#55595f"/><stop offset="1" stop-color="#3f4247"/></linearGradient>
<linearGradient id="lsGlass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2a3036"/><stop offset=".5" stop-color="#14181c"/><stop offset="1" stop-color="#1d2328"/></linearGradient>
<radialGradient id="lsRim" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#8a8e94"/><stop offset="1" stop-color="#4d5156"/></radialGradient></defs><ellipse cx="455" cy="418" rx="420" ry="9" fill="#000" opacity=".45"/>
<g fill="none" stroke="#2c2e31" stroke-width="5" stroke-linecap="round"><path d="M110,40 V30 M300,40 V30 M490,40 V30"/><path d="M96,30 H520" stroke="#3a3c40"/></g>
<path d="M48,58 Q48,40 68,40 L612,40 Q650,41 676,70 L800,228 Q842,236 860,254 Q870,268 870,300 L870,350 Q870,364 854,364 L766,364 A66,66 0 0 0 634,364 L298,364 A66,66 0 0 0 166,364 L62,364 Q46,364 46,348 Z" fill="url(#lsBody)" stroke="#2a2c2f" stroke-width="3"/>
<path d="M50,318 H866 V350 Q866,362 852,362 L766,362 A66,66 0 0 0 634,362 L298,362 A66,66 0 0 0 166,362 L62,362 Q50,362 50,350 Z" fill="#2f3135"/>
<path d="M52,226 H858" stroke="#ffffff" stroke-opacity=".08" stroke-width="2"/>
<path d="M688,84 L796,226 L774,229 L676,98 Z" fill="url(#lsGlass)"/>
<path d="M640,96 H676 L760,214 Q762,220 754,220 H640 Q634,220 634,214 V102 Q634,96 640,96 Z" fill="url(#lsGlass)" stroke="#2a2c2f" stroke-width="2"/>
<rect x="330" y="104" width="190" height="72" rx="10" fill="url(#lsGlass)" stroke="#2a2c2f" stroke-width="2"/>
<rect x="104" y="108" width="128" height="62" rx="9" fill="url(#lsGlass)" stroke="#2a2c2f" stroke-width="2"/>
<path d="M548,48 V312 M628,92 V312" stroke="#2a2c2f" stroke-width="2.5"/><rect x="556" y="236" width="24" height="7" rx="3" fill="#2a2c2f"/><rect x="638" y="236" width="24" height="7" rx="3" fill="#2a2c2f"/>
<path d="M704,166 h18 q6,0 6,6 v24 q0,6 -6,6 h-18 z" fill="#2a2c2f"/>
<path d="M838,258 L868,266 L868,288 L840,282 Z" fill="#d9d4cc" opacity=".9"/><rect x="852" y="300" width="16" height="14" rx="3" fill="#E8833A" opacity=".85"/>
<rect x="46" y="244" width="11" height="58" rx="3" fill="#b8432f"/>
<path d="M166,364 A66,66 0 0 1 298,364 M634,364 A66,66 0 0 1 766,364" fill="none" stroke="#1d1f22" stroke-width="6"/>
<circle cx="232" cy="368" r="52" fill="#121314"/><circle cx="232" cy="368" r="47" fill="none" stroke="#1f2124" stroke-width="3"/><circle cx="232" cy="368" r="31" fill="url(#lsRim)"/><circle cx="232" cy="368" r="31" fill="none" stroke="#2a2c30" stroke-width="2"/><circle cx="232" cy="368" r="11" fill="#2b2d31"/><circle cx="251.0" cy="368.0" r="3.4" fill="#1d1f22"/><circle cx="237.87199259197408" cy="386.06985619754073" r="3.4" fill="#1d1f22"/><circle cx="216.6295049473893" cy="379.1690591294733" r="3.4" fill="#1d1f22"/><circle cx="216.62743550445705" cy="356.8337893253632" r="3.4" fill="#1d1f22"/><circle cx="237.8686440170873" cy="349.92905599032787" r="3.4" fill="#1d1f22"/><circle cx="700" cy="368" r="52" fill="#121314"/><circle cx="700" cy="368" r="47" fill="none" stroke="#1f2124" stroke-width="3"/><circle cx="700" cy="368" r="31" fill="url(#lsRim)"/><circle cx="700" cy="368" r="31" fill="none" stroke="#2a2c30" stroke-width="2"/><circle cx="700" cy="368" r="11" fill="#2b2d31"/><circle cx="719.0" cy="368.0" r="3.4" fill="#1d1f22"/><circle cx="705.871992591974" cy="386.06985619754073" r="3.4" fill="#1d1f22"/><circle cx="684.6295049473894" cy="379.1690591294733" r="3.4" fill="#1d1f22"/><circle cx="684.627435504457" cy="356.8337893253632" r="3.4" fill="#1d1f22"/><circle cx="705.8686440170873" cy="349.92905599032787" r="3.4" fill="#1d1f22"/></g></g><text x="10" y="448" class="vt vtb">REAR</text><text x="884" y="448" class="vt vtb" text-anchor="end">FRONT</text></svg>`;
const REAR_VAN = `<svg viewBox="0 0 371 452" class="vr"><g id="gRear"><line x1="-80" y1="417" x2="451" y2="417" stroke="#3a3833" stroke-width="3"/><defs><linearGradient id="lrBody" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6a6e74"/><stop offset="1" stop-color="#45484d"/></linearGradient>
<linearGradient id="lrGlass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2a3036"/><stop offset="1" stop-color="#14181c"/></linearGradient></defs>
<ellipse cx="185" cy="414" rx="170" ry="7" fill="#000" opacity=".45"/>
<rect x="44" y="372" width="56" height="45" rx="8" fill="#121314"/><rect x="271" y="372" width="56" height="45" rx="8" fill="#121314"/>
<path d="M40,70 Q42,34 80,32 H291 Q329,34 331,70 V372 Q331,382 321,382 H50 Q40,382 40,372 Z" fill="url(#lrBody)" stroke="#2a2c2f" stroke-width="3"/>
<rect x="22" y="128" width="18" height="40" rx="5" fill="#2a2c2f"/><rect x="331" y="128" width="18" height="40" rx="5" fill="#2a2c2f"/>
<rect x="64" y="70" width="110" height="96" rx="9" fill="url(#lrGlass)"/><rect x="197" y="70" width="110" height="96" rx="9" fill="url(#lrGlass)"/>
<path d="M185.5,40 V346" stroke="#2a2c2f" stroke-width="3"/><rect x="168" y="214" width="9" height="26" rx="3" fill="#2a2c2f"/>
<rect x="44" y="226" width="16" height="78" rx="4" fill="#b8432f"/><rect x="311" y="226" width="16" height="78" rx="4" fill="#b8432f"/>
<rect x="40" y="346" width="291" height="34" rx="6" fill="#2f3135"/>
<rect x="139" y="318" width="93" height="22" rx="3" fill="#d9d4cc"/><text id="rearPlate" x="185.5" y="334.5" text-anchor="middle" font-family="'Big Shoulders Stencil Display',Impact,sans-serif" font-weight="800" font-size="15" letter-spacing="1.5" fill="#11120c">NOMAD</text></g><text x="6" y="448" class="vt vtb">LEFT</text><text x="365" y="448" class="vt vtb" text-anchor="end">RIGHT</text></svg>`;
const TOP_VAN = `<svg viewBox="0 0 373 883" class="topv" aria-hidden="true"><defs><linearGradient id="ltBody" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4a4d52"/><stop offset=".5" stop-color="#6a6e74"/><stop offset="1" stop-color="#4a4d52"/></linearGradient></defs>
<rect x="38" y="104" width="22" height="98" rx="8" fill="#121314"/><rect x="313" y="104" width="22" height="98" rx="8" fill="#121314"/>
<rect x="38" y="650" width="22" height="98" rx="8" fill="#121314"/><rect x="313" y="650" width="22" height="98" rx="8" fill="#121314"/>
<path d="M60,90 Q64,22 186,18 Q309,22 313,90 V846 Q313,866 293,866 H80 Q60,866 60,846 Z" fill="url(#ltBody)" stroke="#2a2c2f" stroke-width="3"/>
<path d="M78,150 Q186,126 295,150 L285,232 Q186,216 88,232 Z" fill="#171b1f"/>
<rect x="30" y="226" width="30" height="16" rx="5" fill="#2a2c2f"/><rect x="313" y="226" width="30" height="16" rx="5" fill="#2a2c2f"/>
<rect x="84" y="262" width="205" height="580" rx="14" fill="none" stroke="#2a2c2f" stroke-width="3"/>
<rect x="150" y="330" width="72" height="72" rx="8" fill="#2a2c2f"/><rect x="150" y="700" width="72" height="60" rx="8" fill="#2a2c2f"/>
<g stroke="#2c2e31" stroke-width="6"><path d="M96,450 H277 M96,540 H277 M96,630 H277"/></g></svg>`;

function markup(SW = SWITCHES) {
  return `
<div class="scr" id="scr">
 <header class="bar">
  <div class="id"><span class="plate" id="plate">VAN</span><span class="pill" id="pill" aria-live="polite"><span class="pd"></span><span id="pillText">All systems normal</span></span></div>
  <div class="loc"><svg viewBox="0 0 24 24"><path d="M12 21s7-6.3 7-12a7 7 0 0 0-14 0c0 5.7 7 12 7 12z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="9" r="2.5" fill="currentColor"/></svg><span id="place">Locating…</span><span class="coord" id="coord"></span></div>
  <div class="sys"><span class="sig" id="sig" hidden><i></i><i></i><i></i><i></i></span><span id="net" hidden>4G</span><span class="dot" hidden></span><span id="vrm">Online</span><span class="dot" id="ptDot"></span><span id="pitemp">Pi —</span><button type="button" class="cog" id="nosSetup" hidden aria-label="NomadOS setup"><svg viewBox="0 0 24 24"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" fill="none" stroke="currentColor" stroke-width="1.6"/></svg></button></div>
 </header>
 <div class="main">
  <section class="left">
   <div class="clock"><span class="time" id="time">--:--</span><span class="zulu" id="tz"></span><span class="date" id="date"></span></div>
   <div class="now"><span class="wi big-i" id="wxIcon"></span><div><div class="temp" id="wxTemp">—</div><div class="cond" id="wxCond">Loading weather…</div></div>
    <div class="nexthr"><span class="rb" id="rainBars"></span><span class="nh" id="rainText"></span></div></div>
   <div class="warn" id="warn" hidden></div>
   <div class="wxt">
    <div class="tabs" role="tablist"><button type="button" role="tab" class="on" data-t="brief">Brief</button><button type="button" role="tab" data-t="hours">12 h</button><button type="button" role="tab" data-t="wind">Wind</button><button type="button" role="tab" data-t="radar">Radar</button></div>
    <div class="pane on" data-p="brief"><dl class="bl" id="brief"></dl><div class="meta" id="briefMeta"></div></div>
    <div class="pane" data-p="hours"><svg class="chart" id="chart" viewBox="-8 0 268 92"></svg><div class="hx" id="chartHx"></div>
     <div class="leg"><span><i class="lgt"></i>Temperature</span><span><i class="lgr"></i>Rain chance</span></div><div class="meta" id="chartMeta"></div></div>
    <div class="pane" data-p="wind"><div class="duo">
     <div class="rose"><svg viewBox="0 0 100 100" id="rose"></svg><span class="cap" id="gust"></span></div>
     <div class="sun"><svg viewBox="0 0 120 70" id="sunArc"></svg><div class="sr"><span id="sunrise">—</span><span id="sunset">—</span></div><span class="cap" id="daylight"></span></div></div></div>
    <div class="pane" data-p="radar"><div class="radar" id="radar"><div class="tiles" id="radarTiles"></div><span class="ring rg1"></span><span class="ring rg2"></span><span class="you"></span><span class="rl" id="radarScale">10 km</span><span class="rt" id="radarTime">Rain radar</span></div>
     <div class="scrub" id="scrub"></div><div class="rx"><span>−1 h</span><span>now</span><span>+30 min</span></div></div>
   </div>
   <div class="level" id="lvlOpen" role="button" tabindex="0" aria-label="Open the level">
    <div class="bub"><span class="cross"></span><span class="b" id="miniBub"></span></div>
    <div class="lv"><span class="lab">Level</span><span class="lr" id="lvPitch">—</span><span class="lr" id="lvRoll">—</span></div>
    <span class="open">Tap to level</span><div class="cmp"><span class="lab">Facing</span><b id="facing">—</b><span class="deg" id="facingDeg"></span></div>
   </div>
  </section>
  <section class="centre">
   <div class="stage"><span class="tag"><span id="vehLabel">Veh 01 · Campervan</span><b id="plate2">VAN</b><span id="status">Status · stood down</span></span><img id="vanImg" alt="The van"></div>
   <div class="strip">
    <div class="stat" style="--c:var(--elec)" data-more="soc"><span class="k">Battery</span><span class="big" id="bigSoc">—</span><span class="s" id="subSoc"></span>${scale("scSoc")}</div>
    <div class="stat" style="--c:var(--sun)" data-more="solar"><span class="k">Solar</span><span class="big" id="bigSolar">—</span><span class="s" id="subSolar"></span>${scale("scSolar")}</div>
    <div class="stat" style="--c:var(--heat)" data-more="cabin_temp"><span class="k">Inside</span><span class="big" id="bigCabin">—</span><span class="s" id="subCabin"></span>${scale("scCabin")}</div>
    <div class="stat" style="--c:var(--water)" data-more="fresh"><span class="k">Fresh water</span><span class="big" id="bigFresh">—</span><span class="s" id="subFresh"></span>${scale("scFresh")}</div>
   </div>
  </section>
  <section class="right">
   <div class="grp trg" style="--c:var(--elec)" id="pwGrp" role="button" tabindex="0" aria-label="Open power"><h3>Power</h3>${row("Hook-up", "shore_power")}${row("Alternator", "alternator")}${row("Using now", "ac_load")}${row("Battery", "batt_voltage")}</div>
   <div class="grp trg" style="--c:var(--heat)" id="clGrp" role="button" tabindex="0" aria-label="Open climate and water"><h3>Climate</h3>${row("Hot water", "hot_water", "hc")}${row("Heating", "heat_mode")}${row("Fridge", "fridge_temp", "wc")}</div>
   <div class="grp trg" style="--c:var(--water)" id="waGrp" role="button" tabindex="0" aria-label="Open climate and water"><h3>Water</h3>
    <div class="row bar" data-more="fresh"><span>Fresh</span><b class="wc" id="v_fresh">—</b><i id="barFresh" style="--p:0%;--bc:var(--water)"></i></div>
    <div class="row bar" data-more="waste"><span>Waste</span><b class="xc" id="v_waste">—</b><i id="barWaste" style="--p:0%;--bc:var(--waste)"></i></div></div>
   <div class="grp trg" style="--c:var(--sun)" id="tripsGrp" role="button" tabindex="0" aria-label="Open fuel and trips"><h3>Fuel &amp; trips</h3>
    <div class="row bar"><span>Fuel</span><b class="sc" id="v_fuel">—</b><i id="barFuel" style="--p:0%;--bc:var(--sun)"></i></div>
    <div class="row"><span>Last trip</span><b id="v_lasttrip">—</b></div>
    <div class="row"><span>This month</span><b id="v_month">—</b></div></div>
  </section>
 </div>
 <nav class="dock"><span class="screw s1"></span><span class="screw s2"></span><span class="screw s3"></span><span class="screw s4"></span>
  <div class="sws" style="grid-template-columns:repeat(${Math.max(SW.length, 4)},1fr)">${SW.map(([k, n, ic]) => `<button type="button" class="sw" data-sw="${k}" aria-pressed="false"><span class="led"></span><span class="si">${ic}</span><span class="sn">${n}</span><span class="ss">—</span></button>`).join("")}</div>
  <div class="pages"><span class="pg on">Home</span><button type="button" class="pg" id="pwOpen">Power</button><button type="button" class="pg" id="clOpen">Climate</button><button type="button" class="pg" id="htOpen">Heating</button><button type="button" class="pg" id="fuOpen">Fuses</button><button type="button" class="pg" id="tripsOpen">Vehicle info</button></div>
 </nav>

 <div class="lvlf trp" id="trF" hidden>
  <header class="lh"><span class="lt2">Fuel, trips &amp; engine</span><div class="seg"><button type="button" class="on" data-range="30">Month</button><button type="button" data-range="365">Year</button></div><span class="obd"><span class="pd"></span><span id="obdState">Engine off</span></span><button type="button" class="lx" data-close="trF">Close</button></header>
  <div class="tbody">
   <div class="kps">
    <div class="kp"><span class="lab">Miles</span><b id="kMiles">—</b><span class="ks" id="kMilesS">this month</span></div>
    <div class="kp"><span class="lab">Driving</span><b id="kHours">—</b><span class="ks" id="kHoursS"></span></div>
    <div class="kp"><span class="lab">Average</span><b id="kMpg">—</b><span class="ks">mpg</span></div>
    <div class="kp"><span class="lab">Fuel used</span><b id="kFuel">—</b><span class="ks" id="kFuelS"></span></div>
    <div class="kp"><span class="lab">Charged while driving</span><b id="kCharge">—</b><span class="ks">into the house battery</span></div>
   </div>
   <div class="tg2">
    <section class="tp"><div class="tph"><span class="lab">MPG per trip</span><span class="ks">Dashed line is the average. Worked out from fuel use, so roughly right</span></div><svg class="tc" id="mpgChart" viewBox="-24 0 548 166"></svg></section>
    <section class="tp"><div class="tph"><span class="lab" id="fuelTitle">Fuel, last 30 days</span><span class="fnow" id="fuelNow"></span></div><svg class="tc" id="fuelChart" viewBox="-30 0 560 166"></svg></section>
   </div>
   <div class="tg3">
    <section class="tp"><div class="tph"><span class="lab">Recent trips</span><span class="ks">Start and end from GPS</span></div>
     <table class="tt"><thead><tr><th>When</th><th>Route</th><th class="n">Distance</th><th class="n">Time</th><th class="n">MPG</th></tr></thead><tbody id="tripRows"></tbody></table></section>
    <section class="tp eng"><div class="tph"><span class="lab">Engine and battery</span></div>
     <div class="er" data-more="fault_codes"><span>Fault codes</span><b id="eFault">—</b></div>
     <div class="er" data-more="starter_voltage"><span>Starter battery</span><b id="eStarter">—</b></div>
     <div class="er" data-more="starter_min"><span>Lowest when starting</span><b id="eStarterMin">—</b></div>
     <div class="er" data-more="warmup"><span>Warm-up time</span><b id="eWarm">—</b></div>
     <div class="er" data-more="top_speed"><span>Top speed this month</span><b id="eTop">—</b></div>
     <div class="er" data-more="engine_hours"><span>Engine running</span><b id="eHours">—</b></div></section>
   </div>
  </div>
 </div>

 <div class="lvlf trp" id="pwF" hidden>
  <header class="lh"><span class="lt2">Power</span><div class="seg" data-for="pw"><button type="button" class="on" data-h="24">Day</button><button type="button" data-h="168">Week</button></div><span class="obd"><span class="pd" id="pwDot"></span><span id="pwState">—</span></span><button type="button" class="lx" data-close="pwF">Close</button></header>
  <div class="tbody">
   <div class="kps">
    <div class="kp" data-more="soc"><span class="lab">Battery</span><b id="pSoc" class="ec">—</b><span class="ks" id="pSocS"></span></div>
    <div class="kp" data-more="solar"><span class="lab">Solar</span><b id="pSolar" class="sc">—</b><span class="ks" id="pSolarS"></span></div>
    <div class="kp" data-more="ac_load"><span class="lab">Using now</span><b id="pUse">—</b><span class="ks" id="pUseS"></span></div>
    <div class="kp" data-more="shore_power"><span class="lab">Hook-up</span><b id="pShore">—</b><span class="ks" id="pShoreS"></span></div>
    <div class="kp" data-more="alternator"><span class="lab">Alternator</span><b id="pAlt">—</b><span class="ks" id="pAltS"></span></div>
   </div>
   <div class="tg2">
    <section class="tp"><div class="tph"><span class="lab">Power flow</span><span class="ks">Live, in watts</span></div><svg class="tc" id="flow" viewBox="0 -48 520 262"></svg></section>
    <section class="tp"><div class="tph"><span class="lab" id="socTitle">Battery, last 24 hours</span><span class="ks" id="socLeg"></span><div class="seg cseg" id="socMode"><button type="button" data-m="battery" class="on">Battery</button><button type="button" data-m="solar">Solar</button></div></div><svg class="tc" id="socChart" viewBox="-30 0 560 262"></svg></section>
   </div>
   <div class="tg3">
    <section class="tp"><div class="tph"><span class="lab">Inverter and hook-up</span><span class="ks">Inverter</span></div>
     <div class="modes" id="invModes"></div>
     <p class="mnote" id="invNote"></p>
     <div class="lim"><span>Hook-up limit<small>Turn it down on a weak campsite supply so the hook-up doesn't trip</small></span><button type="button" class="lb" data-lim="-1" aria-label="Lower the limit">−</button><b id="limV">—</b><button type="button" class="lb" data-lim="1" aria-label="Raise the limit">+</button></div>
    </section>
    <section class="tp eng"><div class="tph"><span class="lab">Battery</span></div>
     <div class="er" data-more="batt_voltage"><span>Voltage</span><b id="bV">—</b></div>
     <div class="er" data-more="batt_current"><span>Current</span><b id="bA">—</b></div>
     <div class="er" data-more="batt_power"><span>Power</span><b id="bW">—</b></div>
     <div class="er" data-more="time_to_go"><span>Time left</span><b id="bT">—</b></div>
     <div class="er" data-more="solar_today"><span>Solar today</span><b id="bS">—</b></div>
     <div class="er" data-more="dc_load"><span>12 V things</span><b id="bD">—</b></div></section>
   </div>
  </div>
 </div>

 <div class="lvlf trp" id="clF" hidden>
  <header class="lh"><span class="lt2">Climate &amp; water</span><div class="seg" data-for="cl"><button type="button" class="on" data-h="24">Day</button><button type="button" data-h="168">Week</button></div><span class="obd"><span class="pd" id="clDot"></span><span id="clState">—</span></span><button type="button" class="lx" data-close="clF">Close</button></header>
  <div class="tbody">
   <div class="kps">
    <div class="kp" data-more="cabin_temp"><span class="lab">Inside</span><b id="cCab" class="hc">—</b><span class="ks" id="cCabS"></span></div>
    <div class="kp" data-more="outside_temp"><span class="lab">Outside</span><b id="cOut">—</b><span class="ks" id="cOutS"></span></div>
    <div class="kp" data-more="hot_water"><span class="lab">Hot water</span><b id="cHw" class="hc">—</b><span class="ks" id="cHwS"></span></div>
    <div class="kp" data-more="heater_running"><span class="lab">Diesel heater</span><b id="cHeat">—</b><span class="ks" id="cHeatS"></span></div>
    <div class="kp" data-more="fridge_temp"><span class="lab">Fridge</span><b id="cFr" class="wc">—</b><span class="ks" id="cFrS"></span></div>
   </div>
   <div class="tg2">
    <section class="tp"><div class="tph"><span class="lab" id="tmpTitle">Temperature, last 24 hours</span><span class="ks"><i class="lk" style="--k:var(--heat)"></i>Inside <i class="lk" style="--k:var(--muted)"></i>Outside</span></div><svg class="tc" id="tmpChart" viewBox="-30 0 560 298"></svg></section>
    <section class="tp"><div class="tph"><span class="lab">Water</span><span class="ks" id="tankNote"></span></div>
     <div class="tanks">
      <div class="tank" data-more="fresh" style="--tc:var(--water)"><div class="tv"><i id="tkFresh"></i></div><div><span class="lab">Fresh</span><b id="tkFreshV">—</b><span class="ks" id="tkFreshS"></span></div></div>
      <div class="tank" data-more="waste" style="--tc:var(--waste)"><div class="tv"><i id="tkWaste"></i></div><div><span class="lab">Waste</span><b id="tkWasteV">—</b><span class="ks" id="tkWasteS"></span></div></div>
     </div></section>
   </div>
   <div class="tg3">
    <section class="tp"><div class="tph"><span class="lab">Controls</span><span class="ks">Same switches as the home screen</span></div>
     <div class="sws sw3">${SW.filter(([k, n, ic, role]) => ["sw_heater", "sw_hot_water", "sw_pump"].includes(k) || ["hot_water", "pump"].includes(role)).slice(0, 3).map(([k, n, ic]) => `<button type="button" class="sw" data-sw="${k}" aria-pressed="false"><span class="led"></span><span class="si">${ic}</span><span class="sn">${n}</span><span class="ss">—</span></button>`).join("")}</div>
     <p class="mnote">Heating times, Boost and Keep warm are on the Heating page. Hot water shows here once its temperature sensor is set up.</p><div class="lbtn"><button type="button" id="clToHeat">Heating times</button></div></section>
    <section class="tp eng"><div class="tph"><span class="lab">Comfort</span></div>
     <div class="er" data-more="cabin_humidity"><span>Humidity</span><b id="cHum">—</b></div>
     <div class="er"><span>Dew point</span><b id="cDew">—</b></div>
     <div class="er"><span>Condensation risk</span><b id="cCond">—</b></div>
     <div class="er"><span>Inside vs outside</span><b id="cDiff">—</b></div></section>
   </div>
  </div>
 </div>

 <div class="lvlf trp" id="htF" hidden>
  <header class="lh"><span class="lt2">Heating</span><div class="seg" id="htMode"><button type="button" data-mode="Off">Off</button><button type="button" data-mode="Schedule">Schedule</button><button type="button" data-mode="On">On</button></div><span class="obd"><span class="pd" id="htDot"></span><span id="htState">—</span></span><button type="button" class="lx" data-close="htF">Close</button></header>
  <div class="tbody htb">
   <div class="kps">
    <div class="kp" data-more="cabin_temp"><span class="lab">Inside</span><b id="htCab" class="hc">—</b><span class="ks" id="htCabS"></span></div>
    <div class="kp" data-more="thermostat"><span class="lab">Aiming for</span><b id="htTarget">—</b><span class="ks" id="htTargetS"></span></div>
    <div class="kp" data-more="sw_heater"><span class="lab">Heater</span><b id="htRun">—</b><span class="ks" id="htRunS"></span></div>
    <div class="kp" data-more="heat_schedule"><span class="lab">Next change</span><b id="htNext">—</b><span class="ks" id="htNextS"></span></div>
    <div class="kp" data-more="soc"><span class="lab">Battery</span><b id="htSoc" class="ec">—</b><span class="ks" id="htSocS"></span></div>
   </div>
   <div class="htg">
    <section class="tp"><div class="tph"><span class="lab">Weekly heating times</span><span class="ks">Tap or drag across a day to paint heating on or off · half-hour steps</span></div>
     <div class="wk" id="wk"></div>
     <div class="wkbar"><span class="ks" id="wkSel">Tap a day name to copy it</span>
      <button type="button" class="hb" data-copy="weekdays">Copy to Mon–Fri</button><button type="button" class="hb" data-copy="weekend">Copy to Sat–Sun</button><button type="button" class="hb" data-copy="all">Copy to every day</button><button type="button" class="hb" data-copy="clear">Clear day</button>
      <span class="wkmsg" id="wkMsg"></span><button type="button" class="hb" id="wkUndo" disabled>Undo</button><button type="button" class="hb pri" id="wkSave" disabled>Save</button></div>
    </section>
    <section class="tp eng htc"><div class="tph"><span class="lab">Settings</span></div>
     <div class="lim"><span>Warm to<small>During heating times, On and Boost</small></span><button type="button" class="lb" data-step="heat_comfort" data-d="-0.5" aria-label="Cooler">−</button><b id="htComfort">—</b><button type="button" class="lb" data-step="heat_comfort" data-d="0.5" aria-label="Warmer">+</button></div>
     <div class="lim"><span>Keep warm<small id="htKeepS">Outside heating times, keep it above this</small></span><button type="button" class="lb" data-step="heat_keep_temp" data-d="-0.5" aria-label="Lower">−</button><b id="htKeepT">—</b><button type="button" class="lb" data-step="heat_keep_temp" data-d="0.5" aria-label="Higher">+</button></div>
     <div class="modes m2" id="htKeep"><button type="button" data-keep="off">Keep warm off</button><button type="button" data-keep="on">Keep warm on</button></div>
     <div class="lim"><span>Battery guard<small>Won't start the heater below this</small></span><button type="button" class="lb" data-step="heat_min_soc" data-d="-5" aria-label="Lower">−</button><b id="htMinSoc">—</b><button type="button" class="lb" data-step="heat_min_soc" data-d="5" aria-label="Higher">+</button></div>
     <div class="lbtn"><button type="button" id="htBoost">Boost 1 hour</button></div>
     <p class="mnote" id="htNote"></p>
    </section>
   </div>
  </div>
 </div>

 <div class="lvlf trp" id="fuF" hidden>
  <header class="lh"><span class="lt2">Fuses</span><span class="lstat" id="fuStat">—</span><span class="obd"><span class="pd" id="fuDot"></span><span id="fuBus">—</span></span><button type="button" class="lx" data-close="fuF">Close</button></header>
  <div class="fub">
   <div class="fug" id="fuGroups"></div>
   <section class="tp eng"><div class="tph"><span class="lab">How it checks</span></div>
    <div class="er" data-more="batt_voltage"><span>Battery</span><b id="fuV">—</b></div>
    <div class="er"><span>Fuses watched</span><b id="fuN">—</b></div>
    <p class="hint"><b class="tn2">Victron check.</b> Victron inverters, solar chargers and alternator chargers each measure the battery themselves. If one stops reporting, or sees a very different voltage from the battery monitor, its fuse or cable has gone.</p>
    <p class="hint"><b class="tn2">Sense wire.</b> A thin wire from the far side of the fuse runs to the fuse sensor box. Power on it means the fuse is fine.</p>
    <p class="hint">The main battery fuse can't be watched: if it blows, this screen goes off with everything else.</p>
    <p class="hint" id="fuHint"></p>
    <div class="lbtn"><button type="button" id="fuTest" hidden>Try it: blow a fuse</button></div>
   </section>
  </div>
 </div>

 <div class="lvlf" id="lvlF" hidden>
  <header class="lh"><span class="lt2">Level</span><span class="lstat" id="lStat">Not level</span><button type="button" class="lx" data-close="lvlF">Close</button></header>
  <div class="lbody">
   <div class="bigbub">${TOP_VAN}<span class="ring1"></span><span class="ring2"></span><span class="ax ax1"></span><span class="ax ax2"></span><span class="bb" id="bb"></span>
    <span class="tick tn">Front</span><span class="tick tb">Rear</span><span class="tick tl">Left</span><span class="tick tr">Right</span></div>
   <div class="views">
    <div class="view"><span class="lab">Side · nose</span><div class="ang"><b id="pV">—</b><span id="pT"></span></div>${SIDE_VAN}</div>
    <div class="view"><span class="lab">Rear · lean</span><div class="ang"><b id="rV">—</b><span id="rT"></span></div>${REAR_VAN}</div>
   </div>
   <div class="ramps"><span class="lab">Ramp under each wheel</span>
    <div class="wheels"><div class="wh" id="wFL"><span>Front left</span><b>—</b></div><div class="wh" id="wFR"><span>Front right</span><b>—</b></div>
    <div class="wh" id="wRL"><span>Rear left</span><b>—</b></div><div class="wh" id="wRR"><span>Rear right</span><b>—</b></div></div>
    <p class="hint" id="lvlHint">Heights to raise each wheel so the van sits level. Worked out from your van's wheelbase and width.</p>
    <div class="lbtn"><button type="button" id="lDemo" hidden>Try it: drive onto ramps</button><button type="button" id="lZero">Set this as level</button><button type="button" id="lReset">Clear calibration</button></div>
   </div>
  </div>
 </div>
 <div class="nightveil" id="veil" hidden></div>
</div>`;
}

const EXTRA_CSS = `
:host{display:block;position:relative;width:100%;height:100vh;height:100dvh;overflow:hidden;background:#050607}
.frame{position:absolute;inset:0;overflow:hidden;font-family:var(--body);color:var(--ink);-webkit-font-smoothing:antialiased}
.scr .tiles{position:absolute;inset:0}
.scr .tiles img{position:absolute;width:256px;height:256px;opacity:.85;filter:saturate(.85)}
.row[data-more],.stat[data-more],.er[data-more]{cursor:pointer}
.sw.na{opacity:.45;cursor:default}
.sw[disabled]{pointer-events:none}
.nightveil{position:absolute;inset:0;z-index:30;background:#000;opacity:.45;pointer-events:none;mix-blend-mode:multiply}
.nightveil[hidden]{display:none}
.empty{color:var(--muted);font-size:13px;padding:8px 0}
.demo-badge{position:absolute;right:300px;top:19px;z-index:5;font:600 10px var(--mono);letter-spacing:.12em;text-transform:uppercase;color:#11120c;background:var(--sun);padding:3px 8px;border-radius:4px}
.lbtn button[hidden]{display:none}
.sys [hidden]{display:none!important}
#gSide{transform-origin:476px 422px}
#gRear{transform-origin:185px 417px}
.vtb{font-size:20px}
.view svg{max-height:180px}
.topv{position:absolute;left:50%;top:50%;height:300px;transform:translate(-50%,-50%);opacity:.35;pointer-events:none}
.trp .kp[data-more]{cursor:pointer}
.ec{color:var(--elec)!important}
.lk{display:inline-block;width:10px;height:3px;border-radius:2px;background:var(--k);margin:0 5px 2px 10px;vertical-align:middle}
.fl{fill:none;stroke:#2a2b2c;stroke-width:2.5}
.fl.on{stroke:var(--k);stroke-dasharray:7 7}
@media (prefers-reduced-motion:no-preference){.fl.on{animation:vccflow 1s linear infinite}}
@keyframes vccflow{to{stroke-dashoffset:-14}}
.fn rect{fill:#141517;stroke:var(--hair)}
.fn.on rect{stroke:var(--k)}
.fn .fnl{font:9px var(--mono);letter-spacing:.08em;fill:var(--tan);text-transform:uppercase}
.fn .fnv{font:700 17px var(--disp);fill:var(--ink)}
.fn.off .fnv{fill:var(--muted)}
.modes{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:4px}
.modes button{all:unset;box-sizing:border-box;cursor:pointer;text-align:center;padding:12px 6px;border-radius:9px;font-family:var(--stencil);font-weight:800;font-size:15px;letter-spacing:.1em;text-transform:uppercase;color:#7d786f;
 background:linear-gradient(#202124,#17181a);box-shadow:inset 0 1px 0 #ffffff12,inset 0 -2px 0 #0007,0 2px 4px #0008;display:grid;gap:7px;justify-items:center}
.modes button::before{content:"";width:24px;height:6px;border-radius:2px;background:#24231f;box-shadow:inset 0 1px 2px #000c,0 0 0 1px #3a3833}
.modes button.on{color:var(--tan)}
.modes button.on::before{background:var(--amber)}
.modes button:active{transform:translateY(1px)}
.modes button:focus-visible,.lb:focus-visible,.tank:focus-visible{outline:2px solid var(--amber);outline-offset:2px}
.mnote{margin:4px 0 0;font-size:12.5px;color:var(--muted);line-height:1.45}
.lim{display:grid;grid-template-columns:1fr 46px 76px 46px;gap:8px;align-items:center;border-top:1px solid var(--hair);padding-top:10px;margin-top:6px}
.lim span{font-size:14px;color:#CFC8BC;display:grid;gap:2px}
.lim small{font-size:12px;color:var(--muted)}
.lim b{font-family:var(--disp);font-size:24px;text-align:center}
.lb{all:unset;cursor:pointer;height:42px;display:grid;place-items:center;border-radius:8px;font-size:22px;color:#BDB6AA;background:linear-gradient(#202124,#17181a);box-shadow:inset 0 1px 0 #ffffff12,0 2px 4px #0008}
.lb[disabled]{opacity:.4;pointer-events:none}
.tanks{display:grid;grid-template-columns:1fr 1fr;gap:16px;padding-top:6px}
.tank{display:grid;grid-template-columns:54px 1fr;gap:14px;align-items:end;cursor:pointer}
.tank b{display:block;font-family:var(--disp);font-weight:700;font-size:34px;color:var(--tc);line-height:1.1}
.tank .ks{display:block}
.tv{height:250px;border-radius:8px;background:#141517;box-shadow:inset 0 0 0 1px var(--hair);position:relative;overflow:hidden}
.tv::after{content:"";position:absolute;inset:0;background:repeating-linear-gradient(#0000 0 22.6px,#ffffff10 22.6px 23.6px)}
.tv i{position:absolute;left:0;right:0;bottom:0;height:var(--p,0%);background:var(--tc);opacity:.85;transition:height .4s}
.pages{grid-template-rows:repeat(3,1fr)}
.pill.trg{cursor:pointer;border-radius:6px}
.htb{grid-template-rows:auto 1fr}
#htMode{margin-left:6px}
.htg{display:grid;grid-template-columns:1fr 300px;gap:16px;min-height:0;align-items:stretch}
.wk{display:grid;gap:7px;margin-top:6px;user-select:none;-webkit-user-select:none;touch-action:none}
.wkh,.wkr{display:grid;grid-template-columns:58px 1fr;gap:8px;align-items:center}
.hs{position:relative;height:14px}
.hs span{position:absolute;top:0;transform:translateX(-50%);font:9px var(--mono);color:var(--muted)}
.hs span:first-child{transform:none}.hs span:last-child{transform:translateX(-100%)}
.wkd{all:unset;cursor:pointer;font-family:var(--stencil);font-weight:800;font-size:16px;letter-spacing:.12em;color:#7d786f;text-transform:uppercase;padding:9px 0 9px 9px;border-radius:6px}
.wkd.today{color:var(--tan)}
.wkd.sel{background:var(--olive);color:#11120c}
.wkd:focus-visible{outline:2px solid var(--amber)}
.wkt{position:relative;display:grid;grid-template-columns:repeat(48,1fr);height:58px;border-radius:7px;overflow:hidden;background:#141517;box-shadow:inset 0 0 0 1px var(--hair);cursor:pointer}
.wkt i{border-left:1px solid #1b1c1e;pointer-events:auto}
.wkt i:nth-child(2n+1){border-left-color:#26272a}
.wkt i:nth-child(6n+1){border-left-color:#3a3833}
.wkt i:first-child{border-left:0}
.wkt i.on{background:var(--amber);border-left-color:var(--amber)}
.wkt i.on:nth-child(6n+1){border-left-color:#d38d33}
.wkt .bt{position:absolute;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center;padding-left:6px;line-height:1.25;font:600 10px var(--mono);letter-spacing:.04em;color:#1a1408;white-space:nowrap;overflow:hidden;pointer-events:none}
.wkt .nowl{position:absolute;top:-2px;bottom:-2px;width:2px;margin-left:-1px;background:var(--ink);pointer-events:none}
.wkbar{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:10px}
#wkSel{margin-right:6px}
.hb{all:unset;cursor:pointer;font:500 10.5px var(--mono);letter-spacing:.08em;text-transform:uppercase;color:#BDB6AA;padding:9px 11px;border-radius:7px;background:linear-gradient(#202124,#17181a);box-shadow:inset 0 1px 0 #ffffff12,inset 0 -2px 0 #0007,0 2px 4px #0008}
.hb:active{transform:translateY(1px)}
.hb.pri{background:var(--olive);color:#11120c;box-shadow:none;font-weight:600}
.hb[disabled]{opacity:.35;pointer-events:none}
.hb:focus-visible{outline:2px solid var(--amber);outline-offset:2px}
.wkmsg{font-size:12.5px;color:var(--muted);margin-left:auto}
.wkmsg.err{color:var(--heat)}
.htc{gap:4px}
.htc .lim{margin-top:2px;grid-template-columns:1fr 40px 64px 40px}
.m2{grid-template-columns:1fr 1fr;margin:2px 0 4px}
.m2 button{padding:10px 6px;font-size:13px}
#htBoost.on{color:var(--amber)}
.htc .lbtn{margin-top:8px}
.fub{display:grid;grid-template-columns:1fr 300px;gap:16px;padding:16px 32px 20px;min-height:0}
.fug{display:grid;gap:14px;align-content:start}
.fzs{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.fz{display:grid;grid-template-columns:auto 1fr;grid-template-rows:auto auto auto 1fr;gap:3px 12px;align-items:center;padding:12px 12px 10px;border-radius:10px;background:#141517;box-shadow:inset 0 0 0 1px var(--hair);cursor:pointer;min-height:128px}
.fz svg{grid-row:1/4;width:66px;height:auto;display:block}
.fz.blade svg{width:36px}
.fz.mega{grid-template-columns:1fr;grid-template-rows:auto auto auto auto 1fr}
.fz.mega svg{grid-row:auto;width:92px;margin-bottom:6px}
.fz b{font-family:var(--disp);font-weight:700;font-size:17px;line-height:1.1;color:var(--ink)}
.fz .fr{font:10px var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--tan)}
.fz .fs{display:flex;gap:7px;align-items:center;font-family:var(--stencil);font-weight:800;font-size:14px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
.fz .fs i{width:20px;height:7px;border-radius:2px;background:#24231f;box-shadow:inset 0 1px 2px #000c,0 0 0 1px #3a3833}
.fz.ok .fs{color:var(--elec)}.fz.ok .fs i{background:var(--elec)}
.fz.blown{background:#21160f;box-shadow:inset 0 0 0 2px var(--heat)}
.fz.blown .fs{color:var(--heat)}.fz.blown .fs i{background:var(--heat)}
.fz.na{opacity:.55}
.fz .fd{grid-column:1/-1;align-self:end;font-size:12px;color:var(--muted);line-height:1.35}
.fz.blown .fd{color:#E8C9B0}
.fzh{display:flex;justify-content:space-between;align-items:baseline}
.tn2{color:var(--tan);font-weight:600}
#fuStat.bad{background:var(--heat);color:#16130F}
.fub .hint{font-size:12.5px}
.lbtn button[disabled]{opacity:.4;pointer-events:none}
.sw3{grid-template-columns:repeat(3,1fr);margin-top:4px}
.sw3 .sw{padding:14px 6px 16px}
#pwF .tg3,#clF .tg3{align-items:stretch}
#pwF .tbody,#clF .tbody{grid-template-rows:auto 1fr auto}
@media (prefers-reduced-motion:no-preference){.sw{transition:background .2s}.led{transition:background .2s}}
`;

/* ---------- demo data ---------- */
function demoStates() {
  const s = (v, unit, extra = {}) => ({ state: String(v), attributes: { unit_of_measurement: unit, ...extra } });
  return {
    soc: s(86, "%"), batt_power: s(240, "W"), batt_voltage: s(13.4, "V"), batt_current: s(17.9, "A"), time_to_go: s(0, "s"),
    solar: s(312, "W"), solar_today: s(1.4, "kWh"), solar_forecast: demoForecast(), ac_load: s(72, "W"), dc_load: s(18, "W"),
    shore_voltage: s(0, "V"), shore_power: s(0, "W"), alternator: s(0, "W"), inverter_mode: { state: "on", attributes: { options: ["on", "off", "charger_only", "inverter_only"] } }, shore_limit: { state: "16", attributes: { min: 0, max: 50, step: 1, unit_of_measurement: "A" } },
    cabin_temp: s(19.4, "°C"), cabin_humidity: s(58, "%"), outside_temp: s(11.2, "°C"), hot_water: s(52, "°C"),
    heater_running: { state: "off", attributes: {} }, fridge_temp: s(4, "°C"), fresh: s(72, "%"), waste: s(18, "%"),
    sw_heater: { state: "off", attributes: {} }, sw_hot_water: { state: "on", attributes: {} }, sw_pump: { state: "on", attributes: {} },
    sw_lights: { state: "off", attributes: {} }, sw_awning: { state: "off", attributes: {} }, sw_night: { state: "off", attributes: {} },
    plate: { state: "NOMAD 01", attributes: {} },
    heat_mode: { state: "Schedule", attributes: { options: ["Off", "Schedule", "On"] } }, heat_schedule: { state: "off", attributes: {} },
    heat_comfort: s(19, "°C", { min: 10, max: 25, step: 0.5 }), heat_keep_temp: s(10, "°C", { min: 5, max: 18, step: 0.5 }), heat_min_soc: s(20, "%", { min: 5, max: 60, step: 5 }),
    heat_keep: { state: "on", attributes: {} }, heat_boost: { state: "idle", attributes: {} },
    thermostat: { state: "heat", attributes: { temperature: 19, current_temperature: 19.4, hvac_action: "idle" } },
    location: { state: "not_home", attributes: { latitude: 54.6013, longitude: -3.1347 } },
    speed: s(0, "mph"), pitch: s(1.2, "°"), roll: s(0.4, "°"), heading: s(42, "°"),
    signal: s(-79, "dBm"), internet: { state: "on", attributes: {} }, pi_temp: s(34, "°C"),
    weather_warning: { state: "Yellow warning", attributes: { headline: "Wind · Tue 06:00–18:00" } },
    fuel: s(62, "%"), fuel_range: s(330, "mi"), month_miles: s(412, "mi"), month_hours: s(9.67, "h"), month_mpg: s(31.4, "mpg"),
    month_fuel: s(59, "L"), month_charge: s(4.2, "kWh"), fault_codes: s(0, ""), starter_voltage: s(12.6, "V"), starter_min: s(10.4, "V"),
    warmup: s(6, "min"), top_speed: s(68, "mph"), engine_hours: s(9.87, "h"), engine_running: { state: "off", attributes: {} },
    trips: { state: "8", attributes: { trips: [
      { start: "2026-11-02T14:05", from: "Keswick", to: "Buttermere", miles: 14, minutes: 38, mpg: 28.9 },
      { start: "2026-11-01T11:20", from: "Ambleside", to: "Keswick", miles: 17, minutes: 41, mpg: 32.9 },
      { start: "2026-10-31T10:02", from: "Kendal", to: "Ambleside", miles: 14, minutes: 29, mpg: 30.2 },
      { start: "2026-10-30T08:40", from: "Home", to: "Kendal", miles: 126, minutes: 151, mpg: 33.4 },
      { start: "2026-10-25T13:15", from: "Bamburgh", to: "Home", miles: 188, minutes: 232, mpg: 31.8 },
      { start: "2026-10-24T09:30", from: "Seahouses", to: "Bamburgh", miles: 4, minutes: 12, mpg: 27.1 },
      { start: "2026-10-23T07:55", from: "Home", to: "Seahouses", miles: 171, minutes: 211, mpg: 33.0 },
      { start: "2026-10-18T15:10", from: "Hawes", to: "Home", miles: 64, minutes: 84, mpg: 31.2 },
      { start: "2026-10-17T10:00", from: "Home", to: "Hawes", miles: 66, minutes: 88, mpg: 30.5 },
      { start: "2026-10-11T12:00", from: "Whitby", to: "Home", miles: 92, minutes: 120, mpg: 34.6 },
      { start: "2026-10-10T09:00", from: "Home", to: "Whitby", miles: 95, minutes: 125, mpg: 27.4 },
      { start: "2026-10-04T16:00", from: "Malham", to: "Home", miles: 48, minutes: 62, mpg: 31.0 },
    ] } },
  };
}
function demoForecast() {
  const hourly = []; let tot = 0;
  for (let h = 8; h <= 17; h++) { const wh = Math.round(Math.max(0, Math.sin(((h - 0.5 - 7.3) / 9) * Math.PI)) * 400); if (wh >= 1) { hourly.push({ time: `${String(h).padStart(2, "0")}:00`, wh }); tot += wh; } }
  return { state: String(Math.round(tot / 100) / 10), attributes: { unit_of_measurement: "kWh", hourly } };
}
function demoSeries(pwH, clH) {
  const now = Date.now(), out = {};
  const mk = (hours, f) => { const pts = [], step = hours > 24 ? 3600e3 : 900e3; for (let t = now - hours * 3600e3; t <= now; t += step) { const d = new Date(t); pts.push({ t, v: f(d.getHours() + d.getMinutes() / 60, t) }); } return { hours, pts }; };
  const sun = (h) => Math.max(0, Math.sin(((h - 7.3) / 9) * Math.PI));
  out.solar = mk(pwH, (h, t) => sun(h) * 430 * (0.75 + 0.25 * Math.sin(t / 5e6)));
  let soc = 70; out.soc = mk(pwH, (h) => { soc = clamp(soc + (sun(h) * 1.6 - 0.45) * (pwH > 24 ? 4 : 1), 35, 100); return soc; });
  const base = out.soc.pts[out.soc.pts.length - 1].v, shift = 86 - base; out.soc.pts.forEach((p) => { p.v = clamp(p.v + shift, 20, 100); });
  out.outside_temp = mk(clH, (h, t) => 7 + 4 * Math.sin(((h - 9) / 24) * 2 * Math.PI) + Math.sin(t / 4e7));
  out.cabin_temp = mk(clH, (h) => 13.5 + (5.5 + 0.8 * Math.sin(h)) * clamp((h - 6.5) / 1.5, 0, 1) * clamp((23.5 - h) / 1.5, 0, 1));
  return out;
}
function demoWeather() {
  const now = new Date(); now.setMinutes(0, 0, 0);
  const hours = [], temps = [11, 10, 10, 9, 8, 8, 7, 7, 6, 6, 6, 5], rp = [80, 65, 30, 10, 5, 5, 0, 0, 10, 20, 15, 5], codes = [61, 61, 3, 3, 3, 2, 1, 1, 2, 3, 3, 2];
  for (let i = 0; i < 12; i++) hours.push({ t: new Date(now.getTime() + (i + 1) * 3600e3), temp: temps[i], rain: rp[i], code: codes[i] });
  const day = (o) => new Date(now.getTime() + o * 86400e3);
  const sr = new Date(now); sr.setHours(7, 19); const ss = new Date(now); ss.setHours(16, 21);
  return {
    temp: 11, feels: 8, code: 61, isDay: false, windSpeed: 14, windDir: 225, gust: 26, pressure: 1004, pressureTrend: "rising", elevation: 92,
    minutely: [0.7, 0.8, 0.75, 0.6, 0.55, 0.4, 0.3, 0.2, 0.15, 0.1, 0.05, 0], hours,
    days: [{ d: day(1), code: 2, hi: 13, lo: 6 }, { d: day(2), code: 0, hi: 14, lo: 5 }, { d: day(3), code: 80, hi: 11, lo: 7 }],
    tonightLow: 5, sunrise: sr, sunset: ss, demo: true,
  };
}

/* ---------- the panel ---------- */
class VanCommandCentre extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._ready = false;
    this._tab = 0;
    this._offsets = this._loadOffsets();
    this._weather = null;
    this._history = {};
  }
  set panel(p) {
    this._panel = p;
    const c = (p && p.config) || {};
    this._cfg = (c._panel_custom && c._panel_custom.config) || c; // HA nests the yaml config under _panel_custom
    this._init();
  }
  set narrow(v) {}
  set route(v) {}
  set hass(h) {
    this._hass = h;
    this._init();
    if (!this._raf) this._raf = requestAnimationFrame(() => { this._raf = null; this._update(); });
  }
  get demo() { return (this._cfg || {}).mode === "demo"; }
  _id(key) {
    const h = this._hass, id = this.E[key];
    if (!h || !h.states) return id;
    const ok = (x) => x && h.states[x] && !["unavailable", "unknown"].includes(h.states[x].state);
    if (ok(id)) return id;
    if (this._nos && !this._nos.failed) return id;
    const n = Object.keys(h.states).length;
    if (this._foundN !== n) { this._found = {}; this._foundN = n; }
    if (!(key in this._found)) {
      const f = VCC_FALLBACK[key];
      this._found[key] = ok(f) ? f : this._discover(key) || (f && h.states[f] ? f : null);
    }
    return this._found[key] || id;
  }
  _discover(key) {
    const rule = VCC_DISCOVER[key]; if (!rule) return null;
    const S = this._hass.states; let spare = null;
    for (const id of Object.keys(S).sort()) {
      if (!rule.re.test(id) || (rule.not && rule.not.test(id))) continue;
      const u = (S[id].attributes || {}).unit_of_measurement;
      if (rule.u && !rule.u.includes(u)) continue;
      if (num(S[id].state) != null) return id;
      spare = spare || id;
    }
    return spare;
  }
  get E() { return this._nos && !this._nos.failed ? { ...((this._cfg || {}).entities || {}) } : { ...VCC_DEFAULT_ENTITIES, ...((this._cfg || {}).entities || {}) }; }

  connectedCallback() {
    this._init();
    this._hideSidebar(); // HA sets hass/panel before the page is attached, so send this again once attached
    this._ro = new ResizeObserver(() => this._fit());
    this._ro.observe(this);
    this._clock = setInterval(() => this._tick(), 1000);
    this._wxTimer = setInterval(() => this._loadWeather(), 15 * 60e3);
    this._histTimer = setInterval(() => { this._loadHistory(); this._loadPageHistory(); }, 10 * 60e3);
    this._radarTimer = setInterval(() => this._loadRadar(), 10 * 60e3);
  }
  disconnectedCallback() {
    this._ro && this._ro.disconnect();
    [this._clock, this._wxTimer, this._histTimer, this._radarTimer, this._tabTimer, this._radarAnim, this._demoTimer].forEach((t) => clearInterval(t));
  }

  _init() {
    if (this._ready || !this._cfg || (!this._hass && !this.demo)) return;
    if (this._cfg.nomados && !this.demo && !this._nos) { this._loadNomad(); return; }
    this._ready = true;
    if (!document.getElementById("vcc-fonts")) {
      const l = document.createElement("link");
      l.id = "vcc-fonts"; l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Barlow+Semi+Condensed:wght@500;600;700&family=Martian+Mono:wght@400;500&family=Big+Shoulders+Stencil+Display:wght@600;800&display=swap";
      document.head.appendChild(l);
    }
    const base = this._cfg.asset_base; // optional: a folder holding cc-van.webp and cc-topo.webp to swap the pictures
    const topo = base ? base + "cc-topo.webp" : VCC_TOPO, van = base ? base + "cc-van.webp" : VCC_VAN;
    this.shadowRoot.innerHTML = `<style>${VCC_CSS.replace("__TOPO__", topo)}${EXTRA_CSS}${WZ_CSS}</style><div class="frame">${markup(this._switchList())}</div>`;
    const r = this.shadowRoot;
    this.$ = (id) => r.getElementById(id);
    this.$("vanImg").src = this._cfg.photo || van;
    this._applyFeatures();
    if (this.demo) {
      this._demo = demoStates();
      const b = document.createElement("span"); b.className = "demo-badge"; b.textContent = "Demo"; this.$("scr").appendChild(b);
      this.$("lDemo").hidden = false; this.$("fuTest").hidden = false;
      this._demoTimer = setInterval(() => this._demoJitter(), 4000);
    }
    // Full screen on the tablet: hide the HA sidebar (the Power and Climate pages still have the menu button)
    this._hideSidebar();
    this._wire();
    this._fit();
    this._tick();
    this._loadWeather();
    this._loadHistory();
    this._loadPageHistory();
    this._loadRadar();
    this._update();
    this._cycleTabs();
  }

  _hideSidebar() {
    if (!this._ready || !this.isConnected || (this._cfg || {}).hide_sidebar === false) return;
    this.dispatchEvent(new CustomEvent("hass-dock-sidebar", { detail: { dock: "always_hidden" }, bubbles: true, composed: true }));
  }

  _fit() {
    const scr = this.$ && this.$("scr");
    if (!scr) return;
    const w = this.clientWidth || window.innerWidth, h = this.clientHeight || window.innerHeight;
    const k = Math.min(w / 1280, h / 800);
    scr.style.transform = `translate(${(w - 1280 * k) / 2}px,${(h - 800 * k) / 2}px) scale(${k})`;
  }

  /* --- state access --- */
  _st(key) {
    if (this.demo) return this._demo[key] || null;
    const id = this._id(key);
    return (id && this._hass && this._hass.states[id]) || null;
  }
  _n(key) { const s = this._st(key); return s ? num(s.state) : null; }
  _on(key) { const s = this._st(key); return s ? ["on", "open", "home", "heat", "true"].includes(String(s.state)) : null; }

  /* --- wiring --- */
  _wire() {
    const r = this.shadowRoot;
    r.querySelectorAll(".tabs button").forEach((b, i) => b.addEventListener("click", () => { this._showTab(i); this._cycleTabs(); }));
    r.querySelectorAll(".sw").forEach((b) => b.addEventListener("click", () => this._toggle(b.dataset.sw)));
    // Right-hand groups open their page; the rows inside get their details pop-up on that page instead
    r.querySelectorAll(".right [data-more]").forEach((el) => el.removeAttribute("data-more"));
    r.querySelectorAll("[data-more]").forEach((el) => el.addEventListener("click", () => this._moreInfo(el.dataset.more)));
    r.querySelectorAll("[data-nav]").forEach((b) => b.addEventListener("click", () => this._navigate({ ...VCC_DEFAULT_PAGES, ...(this._cfg.pages || {}) }[b.dataset.nav])));
    r.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => { this.$(b.dataset.close).hidden = true; }));
    const open = (id, render) => () => { ["trF", "lvlF", "pwF", "clF", "htF", "fuF"].forEach((o) => { this.$(o).hidden = o !== id; }); render(); };
    const openTrips = open("trF", () => this._renderTrips()), openLvl = open("lvlF", () => this._renderLevel());
    const openPw = open("pwF", () => this._renderPower()), openCl = open("clF", () => this._renderClimate());
    const openHt = open("htF", () => { this._renderHeating(); this._loadSchedule(); }), openFu = open("fuF", () => this._renderFuses());
    this._openFuses = openFu;
    [["tripsOpen", openTrips], ["tripsGrp", openTrips], ["lvlOpen", openLvl], ["pwOpen", openPw], ["pwGrp", openPw], ["clOpen", openCl], ["clGrp", openCl], ["waGrp", openCl], ["htOpen", openHt], ["clToHeat", openHt], ["fuOpen", openFu]].forEach(([id, fn]) => {
      const el = this.$(id); el.addEventListener("click", fn);
      el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
    });
    r.querySelectorAll("#htMode button").forEach((b) => b.addEventListener("click", () => this._setHeatMode(b.dataset.mode)));
    r.querySelectorAll("[data-step]").forEach((b) => b.addEventListener("click", () => this._stepNum(b.dataset.step, Number(b.dataset.d))));
    r.querySelectorAll("#htKeep button").forEach((b) => b.addEventListener("click", () => this._setKeep(b.dataset.keep === "on")));
    r.querySelectorAll("[data-copy]").forEach((b) => b.addEventListener("click", () => this._copyDay(b.dataset.copy)));
    this.$("htBoost").addEventListener("click", () => this._toggleBoost());
    this.$("wkSave").addEventListener("click", () => this._saveSchedule());
    this.$("wkUndo").addEventListener("click", () => { if (this._schedSaved) { this._schedEdit = this._schedSaved.map((x) => [...x]); this._dirtyLocal = false; this._wkMsg(""); this._drawWeek(); } });
    this.$("fuTest").addEventListener("click", () => this._demoBlow());
    this.$("pill").addEventListener("click", () => { if (this._fuses().some((f) => f.state === "blown")) this._openFuses(); });
    this.$("invModes").addEventListener("click", (e) => { const b = e.target.closest("button[data-opt]"); if (b) this._setInverter(b.dataset.opt); });
    r.querySelectorAll("[data-lim]").forEach((b) => b.addEventListener("click", () => this._stepLimit(Number(b.dataset.lim))));
    r.querySelectorAll('.seg[data-for] button').forEach((b) => b.addEventListener("click", () => {
      const seg = b.parentElement; seg.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
      this._hist = { ...(this._hist || {}), [seg.dataset.for]: Number(b.dataset.h) }; this._loadPageHistory();
    }));
    this._socMode = (() => { try { return localStorage.getItem("vcc-power-chart") || "battery"; } catch (e) { return "battery"; } })();
    r.querySelectorAll("#socMode button").forEach((b) => {
      b.classList.toggle("on", b.dataset.m === this._socMode);
      b.addEventListener("click", () => {
        this._socMode = b.dataset.m; try { localStorage.setItem("vcc-power-chart", this._socMode); } catch (e) {}
        r.querySelectorAll("#socMode button").forEach((x) => x.classList.toggle("on", x === b)); this._renderPower();
      });
    });
    this.$("lZero").addEventListener("click", () => { const p = this._rawLevel(); if (p) { this._offsets = { p: p.p, r: p.r }; this._saveOffsets(); this._renderLevel(); } });
    this.$("lReset").addEventListener("click", () => { this._offsets = { p: 0, r: 0 }; this._saveOffsets(); this._renderLevel(); });
    this.$("lDemo").addEventListener("click", () => this._demoRamps());
    r.querySelectorAll("#trF .seg button").forEach((b) => b.addEventListener("click", () => {
      r.querySelectorAll("#trF .seg button").forEach((x) => x.classList.toggle("on", x === b));
      this._fuelDays = Number(b.dataset.range); this._loadHistory(true);
    }));
  }
  _showTab(i) {
    this._tab = i;
    const r = this.shadowRoot, tabs = [...r.querySelectorAll(".tabs button")];
    tabs.forEach((b, k) => { b.classList.toggle("on", k === i); b.setAttribute("aria-selected", k === i); });
    r.querySelectorAll(".pane").forEach((p) => p.classList.toggle("on", p.dataset.p === tabs[i].dataset.t));
  }
  _cycleTabs() {
    clearInterval(this._tabTimer);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!this._pro && this._nos && !this._nos.failed) return; // Lite shows the Brief tab only
    this._tabTimer = setInterval(() => this._showTab((this._tab + 1) % 4), (this._cfg.tab_seconds || 15) * 1000);
  }
  _moreInfo(key) {
    if (this.demo) return;
    const entityId = this._id(key);
    if (!entityId || !this._hass.states[entityId]) return;
    this.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId }, bubbles: true, composed: true }));
  }
  _navigate(path) {
    if (!path) return;
    if (this.demo && this._cfg.demo_nav === false) return;
    history.pushState(null, "", path);
    window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: false } }));
  }
  _toggle(key) {
    if (key === "sw_heater" && this._st("heat_mode")) {
      const m = this._st("heat_mode").state, boost = this._boostLeft() != null;
      if (m !== "Off") this._lastHeatMode = m;
      this._setHeatMode(m === "Off" && !boost ? this._lastHeatMode || "Schedule" : "Off");
      return;
    }
    const st = this._st(key);
    if (!st) return;
    if (this.demo) {
      if (key === "inverter_mode") st.state = st.state === "off" ? "on" : "off";
      else st.state = st.state === "on" ? "off" : "on";
      this._update(); return;
    }
    const id = this._id(key), dom = id.split(".")[0];
    if (dom === "select") {
      const opts = st.attributes.options || [];
      const target = st.state === "off" ? (opts.includes("on") ? "on" : opts[0]) : (opts.includes("off") ? "off" : st.state);
      this._hass.callService("select", "select_option", { entity_id: id, option: target });
    } else {
      this._hass.callService("homeassistant", "toggle", { entity_id: id });
    }
  }

  /* --- clock --- */
  _tick() {
    if (!this.$) return;
    const d = new Date();
    this.$("time").textContent = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    this.$("date").textContent = d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
    const tz = new Intl.DateTimeFormat("en-GB", { timeZoneName: "short" }).formatToParts(d).find((p) => p.type === "timeZoneName");
    this.$("tz").textContent = tz ? (tz.value === "GMT+1" ? "BST" : tz.value) : "";
  }

  /* --- main update --- */
  _update() {
    if (!this._ready) return;
    if (this._wz) this._wzLive();
    const $ = this.$, n = (k) => this._n(k);
    // plate
    const ps = this._st("plate"), pv = ps && ps.state;
    const plate = pv && !["unknown", "unavailable", ""].includes(pv) ? pv : this._cfg.plate || "VAN";
    $("plate").textContent = plate.toUpperCase(); $("plate2").textContent = plate.toUpperCase();
    const rp = this.$("rearPlate"); if (rp) rp.textContent = plate.toUpperCase().slice(0, 10);
    // big four
    const soc = n("soc"), bp = n("batt_power"), ttg = n("time_to_go");
    $("bigSoc").innerHTML = soc == null ? "—" : `${Math.round(soc)}<small>%</small>`;
    let sub = "";
    if (bp != null) {
      if (bp > 5) {
        sub = `charging +${Math.round(bp)} W`;
        const capWh = (this._cfg.battery_wh || 2560);
        if (soc != null && soc < 99) { const mins = ((100 - soc) / 100) * capWh / bp * 60; const t = new Date(Date.now() + mins * 60e3); sub += ` · full by ${pad2(t.getHours())}:${pad2(t.getMinutes())}`; }
      } else if (bp < -5) {
        sub = `using ${Math.round(-bp)} W`;
        if (ttg) { const m = Math.round(ttg / 60); sub += ` · ${Math.floor(m / 60)}h ${m % 60}m left`; }
      } else sub = "resting";
    }
    $("subSoc").textContent = sub;
    $("scSoc").style.width = `${clamp(soc || 0, 0, 100)}%`;
    const solar = n("solar"), st = n("solar_today");
    $("bigSolar").innerHTML = solar == null ? "—" : `${Math.round(solar)}<small>W</small>`;
    $("subSolar").textContent = st == null ? "" : `${st.toFixed(1)} kWh today`;
    $("scSolar").style.width = `${clamp(((solar || 0) / (this._cfg.solar_wp || VCC_SOLAR_WP)) * 100, 0, 100)}%`;
    const cab = n("cabin_temp"), hum = n("cabin_humidity"), out = n("outside_temp");
    $("bigCabin").innerHTML = cab == null ? "—" : `${cab.toFixed(1)}<small>°</small>`;
    $("subCabin").textContent = [hum != null ? `humidity ${Math.round(hum)}%` : "", out != null && hum == null ? `outside ${out.toFixed(1)}°` : ""].filter(Boolean).join(" · ");
    $("scCabin").style.width = `${clamp(((cab || 0) / 30) * 100, 0, 100)}%`;
    const fresh = n("fresh"), waste = n("waste");
    $("bigFresh").innerHTML = fresh == null ? "—" : `${Math.round(fresh)}<small>%</small>`;
    $("subFresh").textContent = fresh == null ? "" : `about ${Math.round((fresh / 100) * (this.E.fresh_litres || 100))} L left`;
    $("scFresh").style.width = `${clamp(fresh || 0, 0, 100)}%`;
    // right column
    const sv = n("shore_voltage"), sp = n("shore_power");
    const shore = $("v_shore_power");
    if (sv != null && sv > 100) { shore.textContent = `${Math.round(sp || 0)} W`; shore.className = ""; } else { shore.textContent = sv == null ? "—" : "Not connected"; shore.className = "dim"; }
    const W = (k) => { const v = n(k); return v == null ? "—" : `${Math.round(v)} W`; };
    $("v_alternator").textContent = W("alternator");
    const ac = n("ac_load"), dc = n("dc_load");
    $("v_ac_load").textContent = ac == null && dc == null ? "—" : `${Math.round((ac || 0) + (dc || 0))} W`;
    const bv = n("batt_voltage"); $("v_batt_voltage").textContent = bv == null ? "—" : `${bv.toFixed(1)} V`;
    const hw = n("hot_water"); $("v_hot_water").textContent = hw == null ? "—" : `${Math.round(hw)}°`;
    const hi = this._heatInfo(), vh = $("v_heat_mode");
    vh.textContent = !hi.ms ? "Not set up" : hi.boost != null ? `Boost · ${hi.boost} min` : hi.want === "paused" ? "Paused · battery" : hi.mode === "Off" ? "Off" : hi.target != null ? `${hi.mode === "On" ? "On" : "Schedule"} · ${hi.target.toFixed(0)}°` : "Schedule · off";
    vh.className = !hi.ms || hi.mode === "Off" ? "dim" : hi.target != null ? "hc" : "";
    const fr = n("fridge_temp"); $("v_fridge_temp").textContent = fr == null ? "—" : `${Math.round(fr)}°`;
    $("v_fresh").textContent = fresh == null ? "—" : `${Math.round(fresh)}%`; $("barFresh").style.setProperty("--p", `${clamp(fresh || 0, 0, 100)}%`);
    $("v_waste").textContent = waste == null ? "—" : `${Math.round(waste)}%`; $("barWaste").style.setProperty("--p", `${clamp(waste || 0, 0, 100)}%`);
    const fuel = n("fuel"), range = n("fuel_range");
    $("v_fuel").textContent = fuel == null ? "No reader yet" : `${Math.round(fuel)}%${range != null ? ` · ${Math.round(range)} mi` : ""}`;
    $("barFuel").style.setProperty("--p", `${clamp(fuel || 0, 0, 100)}%`);
    const trips = this._trips();
    $("v_lasttrip").textContent = trips.length ? `${Math.round(trips[0].miles)} mi${trips[0].mpg ? ` · ${trips[0].mpg.toFixed(1)} mpg` : ""}` : "—";
    const mm = n("month_miles"); $("v_month").textContent = mm == null ? "—" : `${Math.round(mm)} mi`;
    // switches
    this.shadowRoot.querySelectorAll(".sw").forEach((b) => {
      const k = b.dataset.sw, hm0 = k === "sw_heater" ? this._st("heat_mode") : null, s = hm0 || this._st(k), ss = b.querySelector(".ss");
      if (!s) { b.classList.remove("on"); b.classList.add("na"); b.disabled = true; ss.textContent = "Not set up"; return; }
      b.classList.remove("na"); b.disabled = false;
      let on, label;
      if (hm0) { const bm = this._boostLeft(), c = this._n("heat_comfort"); on = hm0.state !== "Off" || bm != null; label = bm != null ? `Boost · ${bm} min` : hm0.state === "Off" ? "Off" : `${hm0.state} · ${fmt(c, 0)}°`; }
      else if (k === "inverter_mode") { on = s.state !== "off"; label = on ? `${s.state === "on" ? "On" : s.state.replace(/_/g, " ")}${ac != null ? ` · ${Math.round(ac)} W` : ""}` : "Off"; }
      else { on = s.state === "on"; label = on ? "On" : "Off"; if (k === "sw_hot_water" && on) label = "On · 230V"; }
      b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); ss.textContent = label;
    });
    $("veil").hidden = !(this._on("sw_night"));
    // top bar
    this._updateTopBar();
    // status pill
    const alerts = [];
    if (soc != null && soc < 20) alerts.push("Low battery");
    if (fresh != null && fresh < 10) alerts.push("Fresh water low");
    if (waste != null && waste > 85) alerts.push("Waste nearly full");
    const fc = n("fault_codes"); if (fc) alerts.push("Engine fault code");
    const blownF = this._fuses().filter((f) => f.state === "blown");
    if (blownF.length) alerts.unshift(blownF.length === 1 ? `Fuse blown: ${blownF[0].name}` : `${blownF.length} fuses blown`);
    $("pill").classList.toggle("trg", blownF.length > 0);
    $("pillText").textContent = alerts.length ? alerts.join(" · ") : "All systems normal";
    $("pill").querySelector(".pd").style.background = alerts.length ? "var(--heat)" : "";
    const moving = (n("speed") || 0) > 3 || this._on("engine_running");
    $("status").textContent = moving ? "Status · on the move" : "Status · stood down";
    // level + compass
    this._renderMiniLevel();
    if (!this.$("lvlF").hidden) this._renderLevel();
    if (!this.$("trF").hidden) this._renderTrips();
    if (!this.$("pwF").hidden) this._renderPower();
    if (!this.$("clF").hidden) this._renderClimate();
    if (!this.$("htF").hidden) this._renderHeating();
    if (!this.$("fuF").hidden) this._renderFuses();
    // weather warning
    const ww = this._st("weather_warning");
    const warn = $("warn");
    if (ww && ww.state && !["unknown", "unavailable", "none", "None", "", "0"].includes(ww.state)) { warn.hidden = false; warn.innerHTML = `<b>${$esc(ww.state)}</b> ${$esc(ww.attributes.headline || "")}`; }
    else warn.hidden = true;
  }

  _location() {
    const t = this._st("location");
    if (t && t.attributes.latitude != null) return { lat: t.attributes.latitude, lon: t.attributes.longitude };
    if (this._hass && this._hass.states["zone.home"]) { const z = this._hass.states["zone.home"].attributes; return { lat: z.latitude, lon: z.longitude }; }
    if (this._hass && this._hass.config) return { lat: this._hass.config.latitude, lon: this._hass.config.longitude };
    return null;
  }
  _updateTopBar() {
    const $ = this.$, loc = this._location();
    const moving = (this._n("speed") || 0) > 3;
    if (loc) {
      const g = osGridRef(loc.lat, loc.lon);
      const elev = this._weather && this._weather.elevation != null ? ` · Elev ${Math.round(this._weather.elevation)} m` : "";
      $("coord").textContent = (g ? `Grid ${g}` : `${loc.lat.toFixed(3)}, ${loc.lon.toFixed(3)}`) + elev;
      this._reverseGeocode(loc);
    }
    $("place").textContent = `${moving ? "Moving" : "Parked"} · ${this._placeName || "Locating…"}`;
    const sig = this._n("signal");
    const bars = sig == null ? 3 : sig > -65 ? 4 : sig > -75 ? 3 : sig > -85 ? 2 : sig > -95 ? 1 : 0;
    $("sig").querySelectorAll("i").forEach((i, k) => i.classList.toggle("off", k >= bars));
    const online = this.demo ? true : this._st("internet") ? this._on("internet") : navigator.onLine;
    $("vrm").textContent = online ? "Online" : "Offline";
    const pt = this._n("pi_temp"); $("pitemp").textContent = pt == null ? "" : `Pi ${Math.round(pt)}°`; $("ptDot").hidden = pt == null;
  }
  async _reverseGeocode(loc) {
    if (this.demo) { this._placeName = "Keswick, Cumbria"; return; }
    const key = `${loc.lat.toFixed(2)},${loc.lon.toFixed(2)}`;
    if (this._geoKey === key) return;
    this._geoKey = key;
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&lat=${loc.lat}&lon=${loc.lon}`, { headers: { "Accept-Language": "en-GB" } });
      const j = await r.json(), a = j.address || {};
      this._placeName = [a.village || a.town || a.city || a.hamlet || a.suburb, a.county || a.state_district || a.state].filter(Boolean).join(", ");
    } catch (e) { this._placeName = ""; }
    this._updateTopBar();
  }

  /* --- level --- */
  _loadOffsets() { try { return JSON.parse(localStorage.getItem("vcc-level-offsets")) || { p: 0, r: 0 }; } catch (e) { return { p: 0, r: 0 }; } }
  _saveOffsets() { try { localStorage.setItem("vcc-level-offsets", JSON.stringify(this._offsets)); } catch (e) {} }
  _demoJitter() {
    const d = this._demo, j = (k, amt, lo, hi, dec = 0) => { const v = clamp(parseFloat(d[k].state) + (Math.random() - 0.5) * amt, lo, hi); d[k].state = v.toFixed(dec); };
    j("solar", 24, 200, 420); j("ac_load", 10, 40, 120); j("batt_power", 20, 180, 300); j("cabin_temp", 0.2, 18.8, 20.2, 1);
    this._update();
  }

  /* --- weather --- */
  async _loadWeather() {
    if (this.demo) { this._weather = demoWeather(); this._renderWeather(); return; }
    const loc = this._location();
    if (!loc) return;
    const u = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&current=temperature_2m,apparent_temperature,weather_code,is_day,wind_speed_10m,wind_direction_10m,wind_gusts_10m,pressure_msl&minutely_15=precipitation&hourly=temperature_2m,precipitation_probability,weather_code,pressure_msl&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset&wind_speed_unit=mph&timezone=auto&forecast_days=4&forecast_minutely_15=8&past_hours=3`;
    try {
      const j = await (await fetch(u)).json();
      const c = j.current, now = Date.now();
      const hrsAll = j.hourly.time.map((t, i) => ({ t: new Date(t), temp: j.hourly.temperature_2m[i], rain: j.hourly.precipitation_probability[i], code: j.hourly.weather_code[i], p: j.hourly.pressure_msl[i] }));
      const future = hrsAll.filter((h) => h.t.getTime() > now);
      const past = hrsAll.filter((h) => h.t.getTime() <= now);
      const p3 = past.length >= 3 ? past[past.length - 3].p : null;
      const days = j.daily.time.map((t, i) => ({ d: new Date(t), code: j.daily.weather_code[i], hi: j.daily.temperature_2m_max[i], lo: j.daily.temperature_2m_min[i], sunrise: new Date(j.daily.sunrise[i]), sunset: new Date(j.daily.sunset[i]) }));
      const tonight = future.filter((h) => h.t.getTime() < now + 18 * 3600e3);
      this._weather = {
        temp: c.temperature_2m, feels: c.apparent_temperature, code: c.weather_code, isDay: !!c.is_day, windSpeed: c.wind_speed_10m, windDir: c.wind_direction_10m, gust: c.wind_gusts_10m,
        pressure: c.pressure_msl, pressureTrend: p3 == null ? "" : c.pressure_msl - p3 > 1 ? "rising" : c.pressure_msl - p3 < -1 ? "falling" : "steady", elevation: j.elevation,
        minutely: (j.minutely_15 && j.minutely_15.precipitation || []).slice(0, 8), hours: future.slice(0, 12), days: days.slice(1, 4),
        tonightLow: tonight.length ? Math.min(...tonight.map((h) => h.temp)) : null,
        sunrise: days[0].sunrise.getTime() < now ? days[1].sunrise : days[0].sunrise, sunset: days[0].sunset, sunriseToday: days[0].sunrise,
      };
      this._wxError = null;
    } catch (e) { this._wxError = "Weather offline"; }
    this._renderWeather(); this._updateTopBar();
  }
  _renderWeather() {
    const $ = this.$, w = this._weather;
    if (!w) { $("wxCond").textContent = this._wxError || "Loading weather…"; return; }
    const [ic, words] = wmo(w.code, w.isDay);
    $("wxIcon").innerHTML = ICON[ic];
    $("wxTemp").innerHTML = `${Math.round(w.temp)}<small>°</small>`;
    $("wxCond").textContent = `${words} · feels ${Math.round(w.feels)}°`;
    // next hour rain bars (Open-Meteo gives 15-minute steps; demo gives 12 bars)
    const m = w.minutely || [], mx = Math.max(0.5, ...m);
    $("rainBars").innerHTML = m.map((v) => `<i style="height:${Math.max(2, (v / mx) * 100)}%"></i>`).join("");
    const raining = m.length && m[0] > 0.05;
    let rt = "Dry for the next hour";
    if (raining) { const stop = m.findIndex((v) => v <= 0.05); rt = stop === -1 ? "Rain for the next hour" : `Stops in ~${stop * (w.demo ? 5 : 15)} min`; }
    else if (m.some((v) => v > 0.05)) { const start = m.findIndex((v) => v > 0.05); rt = `Rain in ~${start * (w.demo ? 5 : 15)} min`; }
    $("rainText").textContent = rt;
    // brief
    const hrs = w.hours, nxt = hrs.slice(0, 3);
    const nxtWet = nxt.filter((h) => h.rain >= 50).length;
    const nextTxt = nxt.length ? `${nxtWet === 3 ? "Wet throughout" : nxtWet ? "Showers easing" : "Mostly dry"}, wind ${compass(w.windDir)} ${Math.round(w.windSpeed)} gusting ${Math.round(w.gust)}` : "—";
    const dayName = (d) => d.toLocaleDateString("en-GB", { weekday: "short" });
    const brief = [["Next 3h", nextTxt], ["Tonight", w.tonightLow != null ? `Low <b>${Math.round(w.tonightLow)}°</b>${w.tonightLow <= 1 ? ", frost likely" : w.tonightLow <= 3 ? ", frost possible" : ""}` : "—"]];
    w.days.slice(0, 2).forEach((d) => brief.push([dayName(d.d), `${wmo(d.code)[1]}, <b>${Math.round(d.hi)}°</b> / ${Math.round(d.lo)}°`]));
    $("brief").innerHTML = brief.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join("");
    const hm = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    $("briefMeta").innerHTML = `<span>Sunset <b>${hm(w.sunset)}</b></span><span>Pressure <b>${Math.round(w.pressure)}</b> ${w.pressureTrend}</span>`;
    // 12 h chart
    const Wd = 252, H = 90, temps = hrs.map((h) => h.temp);
    if (temps.length) {
      const lo = Math.floor(Math.min(...temps)) - 1, hi = Math.ceil(Math.max(...temps)) + 1;
      const pts = temps.map((t, i) => [(i * Wd) / (temps.length - 1), 12 + ((hi - t) * (H - 30)) / (hi - lo)]);
      const line = "M" + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L");
      const bars = hrs.map((h, i) => (h.rain ? `<rect x="${(pts[i][0] - 5).toFixed(1)}" y="${(H - 2 - h.rain * 0.28).toFixed(1)}" width="10" height="${(h.rain * 0.28).toFixed(1)}" rx="1.5" fill="var(--water)" opacity=".8"/>` : "")).join("");
      const lbl = pts.map(([x, y], i) => (i % 3 === 0 ? `<text x="${x.toFixed(1)}" y="${(y - 6).toFixed(1)}" text-anchor="middle">${Math.round(temps[i])}°</text>` : "")).join("");
      $("chart").innerHTML = `<path d="${line} L${Wd} ${H - 10} L0 ${H - 10}Z" fill="color-mix(in srgb,var(--heat) 14%,transparent)"/><path d="${line}" fill="none" stroke="var(--heat)" stroke-width="2"/>${bars}<g class="cl">${lbl}</g>`;
      $("chartHx").innerHTML = hrs.filter((_, i) => i % 3 === 0).map((h) => `<span>${pad2(h.t.getHours())}</span>`).join("");
      $("chartMeta").innerHTML = `<span>Low tonight <b>${w.tonightLow != null ? Math.round(w.tonightLow) + "°" : "—"}</b></span>${w.days[0] ? `<span>High ${dayName(w.days[0].d)} <b>${Math.round(w.days[0].hi)}°</b></span>` : ""}`;
    }
    // wind rose
    let rose = `<circle cx="50" cy="50" r="42" fill="none" stroke="var(--hair)" stroke-width="1.5"/>`;
    for (let k = 0; k < 360; k += 15) rose += `<line x1="50" y1="${k % 90 ? 12 : 10}" x2="50" y2="${k % 90 ? 14 : 16}" transform="rotate(${k} 50 50)" stroke="${k % 90 ? "#6c675f" : "var(--tan)"}" stroke-width="1.5"/>`;
    rose += `<text x="50" y="27" class="cp">N</text><g transform="rotate(${w.windDir + 180} 50 50)"><path d="M50 22 L56 50 L50 46 L44 50Z" fill="var(--water)"/></g><text x="50" y="60" class="wv">${Math.round(w.windSpeed)}</text><text x="50" y="72" class="wu">MPH ${compass(w.windDir)}</text>`;
    $("rose").innerHTML = rose;
    $("gust").textContent = `Gusts ${Math.round(w.gust)} mph`;
    // sun arc
    const now = Date.now(), srT = (w.sunriseToday || w.sunrise).getTime(), ssT = w.sunset.getTime();
    const frac = clamp((now - srT) / (ssT - srT), 0, 1), ang = Math.PI * (1 - frac), cx = 60 + 52 * Math.cos(ang), cy = 62 - 52 * Math.sin(ang);
    $("sunArc").innerHTML = `<path d="M8 62 A52 52 0 0 1 112 62" fill="none" stroke="var(--hair)" stroke-width="1.5" stroke-dasharray="3 3"/><path d="M8 62 A52 52 0 0 1 ${cx.toFixed(1)} ${cy.toFixed(1)}" fill="none" stroke="var(--sun)" stroke-width="1.8" opacity=".5"/><line x1="0" y1="62" x2="120" y2="62" stroke="#3a3833"/><circle cx="${cx.toFixed(1)}" cy="${Math.min(cy, 58).toFixed(1)}" r="4" fill="var(--sun)"/>`;
    $("sunrise").textContent = hm(w.sunriseToday || w.sunrise); $("sunset").textContent = hm(w.sunset);
    const left = ssT - now, dl = ssT - srT;
    const hmDur = (ms) => `${Math.floor(ms / 3600e3)}h ${pad2(Math.floor((ms % 3600e3) / 60e3))}m`;
    $("daylight").textContent = left > 0 && now > srT ? `${hmDur(left)} of daylight left` : `Sunrise in ${hmDur(Math.max(0, w.sunrise.getTime() - now))}`;
    this._updateTopBar();
  }

  /* --- rain radar (RainViewer, free, no key) --- */
  _setInverter(opt) {
    const st = this._st("inverter_mode"); if (!st) return;
    if (this.demo) { st.state = opt; this._update(); return; }
    this._hass.callService("select", "select_option", { entity_id: this._id("inverter_mode"), option: opt });
  }
  _stepLimit(dir) {
    const st = this._st("shore_limit"); if (!st) return;
    const a = st.attributes || {}, step = Number(a.step) || 1, v = num(st.state);
    if (v == null) return;
    const next = clamp(Math.round((v + dir * step) / step) * step, a.min != null ? Number(a.min) : 0, a.max != null ? Number(a.max) : 50);
    if (this.demo) { st.state = String(next); this._renderPower(); return; }
    this._hass.callService("number", "set_value", { entity_id: this._id("shore_limit"), value: next });
  }
  async _loadPageHistory() {
    const h = this._hist || {}, pwH = h.pw || 24, clH = h.cl || 24;
    this._series = this._series || {};
    if (this.demo || !this._hass || !this._hass.callWS) { this._series = demoSeries(pwH, clH); this._renderPower(); this._renderClimate(); return; }
    const get = async (keys, hours) => {
      const ids = keys.map((k) => this._id(k)).filter((id) => id && this._hass.states[id]);
      if (!ids.length) return;
      try {
        const r = await this._hass.callWS({ type: "history/history_during_period", start_time: new Date(Date.now() - hours * 3600e3).toISOString(), entity_ids: ids, minimal_response: true, no_attributes: true, significant_changes_only: false });
        keys.forEach((k) => { const id = this._id(k); if (r[id]) this._series[k] = { hours, pts: r[id].map((p) => ({ t: (p.lu || p.lc) * 1000, v: num(p.s) })).filter((p) => p.v != null) }; });
      } catch (e) { /* history is optional */ }
    };
    await Promise.all([get(["soc", "solar"], pwH), get(["cabin_temp", "outside_temp"], clH)]);
    this._renderPower(); this._renderClimate();
  }
  _lineChart(svgId, series, { lo, hi, unit, hours, empty }) {
    const vb = this.$(svgId).viewBox.baseVal, W = 520, H = ((vb && vb.height) || 166) - 16, now = Date.now(), t0 = now - hours * 3600e3;
    const have = series.filter((s) => s.pts && s.pts.length > 1);
    if (!have.length) { this.$(svgId).innerHTML = `<text x="260" y="${Math.round(H / 2)}" class="ca2" text-anchor="middle">${empty}</text>`; return; }
    const fx = (t) => clamp(((t - t0) / (now - t0)) * W, 0, W), fy = (v) => H - 10 - ((clamp(v, lo, hi) - lo) * (H - 20)) / (hi - lo);
    const mid = Math.round((lo + hi) / 2);
    let g = [lo, mid, hi].map((v) => `<line x1="0" x2="${W}" y1="${fy(v)}" y2="${fy(v)}" stroke="#22231f"/><text x="-6" y="${fy(v) + 3}" class="ca">${v}${unit}</text>`).join("");
    have.forEach((s) => {
      // carry the last value forward to now so the line reaches the right edge
      const pts = [...s.pts.filter((p) => p.t >= t0)]; const before = s.pts.filter((p) => p.t < t0).pop();
      if (before) pts.unshift({ t: t0, v: before.v });
      if (!pts.length) return;
      pts.push({ t: now, v: pts[pts.length - 1].v });
      const d = "M" + pts.map((p) => `${fx(p.t).toFixed(1)} ${fy(p.v).toFixed(1)}`).join(" L");
      if (s.fill) g += `<path d="${d} L${W} ${H - 10} L0 ${H - 10}Z" fill="color-mix(in srgb,${s.color} 14%,transparent)"/>`;
      g += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="${s.width || 2}"${s.dash ? ' stroke-dasharray="4 4"' : ""}/>`;
    });
    const lbl = hours > 24 ? [`${Math.round(hours / 24)} days ago`, "Now"] : ["24 h ago", "Now"];
    g += `<text x="0" y="${H + 12}" class="ca2">${lbl[0]}</text><text x="${W}" y="${H + 12}" class="ca2" text-anchor="end">${lbl[1]}</text>`;
    this.$(svgId).innerHTML = g;
  }
  _renderPower() {
    if (!this._ready) return;
    const $ = this.$, n = (k) => this._n(k), Wt = (v) => (v == null ? "—" : `${Math.round(v)} W`);
    const soc = n("soc"), bp = n("batt_power"), solar = n("solar"), st = n("solar_today"), ac = n("ac_load"), dc = n("dc_load");
    const sv = n("shore_voltage"), sp = n("shore_power"), alt = n("alternator"), ttg = n("time_to_go");
    const shoreOn = sv != null && sv > 100;
    $("pSoc").innerHTML = soc == null ? "—" : `${Math.round(soc)}<small>%</small>`;
    $("pSocS").textContent = this.$("subSoc").textContent;
    $("pSolar").textContent = Wt(solar); $("pSolarS").textContent = st == null ? "" : `${st.toFixed(1)} kWh today`;
    const use = ac == null && dc == null ? null : (ac || 0) + (dc || 0);
    $("pUse").textContent = Wt(use); $("pUseS").textContent = use == null ? "" : `230 V ${Math.round(ac || 0)} W · 12 V ${Math.round(dc || 0)} W`;
    $("pShore").textContent = sv == null ? "—" : shoreOn ? Wt(sp) : "Off"; $("pShoreS").textContent = shoreOn ? `${Math.round(sv)} V supply` : sv == null ? "" : "Not plugged in";
    $("pAlt").textContent = Wt(alt); $("pAltS").textContent = alt == null ? "" : alt > 5 ? "Charging while driving" : "Engine off";
    const state = bp == null ? "—" : bp > 5 ? `Charging +${Math.round(bp)} W` : bp < -5 ? `Using ${Math.round(-bp)} W from the battery` : "Battery resting";
    $("pwState").textContent = state; $("pwDot").style.background = bp != null && bp > 5 ? "var(--elec)" : bp != null && bp < -5 ? "var(--heat)" : "";
    // flow diagram
    const node = (x, y, w, label, val, on, k) => `<g class="fn ${on ? "on" : "off"}" style="--k:${k}"><rect x="${x}" y="${y}" width="${w}" height="40" rx="7"/><text x="${x + 12}" y="${y + 15}" class="fnl">${label}</text><text x="${x + 12}" y="${y + 33}" class="fnv">${val}</text></g>`;
    const line = (d, on, k) => `<path class="fl ${on ? "on" : ""}" style="--k:${k}" d="${d}"/>`;
    const sOn = (solar || 0) > 5, hOn = shoreOn && (sp || 0) > 5, aOn = (alt || 0) > 5, lOn = (use || 0) > 5;
    let g = line("M112 25 C160 25 160 83 206 83", sOn, "var(--sun)") + line("M112 83 L206 83", hOn, "var(--elec)") + line("M112 141 C160 141 160 83 206 83", aOn, "var(--tan)") + line("M314 83 L408 83", lOn, "var(--ink)");
    g += node(4, 5, 108, "Solar", Wt(solar), sOn, "var(--sun)") + node(4, 63, 108, "Hook-up", shoreOn ? Wt(sp) : "Off", hOn, "var(--elec)") + node(4, 121, 108, "Alternator", Wt(alt), aOn, "var(--tan)");
    g += `<g class="fn on" style="--k:var(--elec)"><rect x="206" y="48" width="108" height="70" rx="8"/><text x="220" y="66" class="fnl">Battery</text><text x="220" y="94" class="fnv" style="font-size:28px;fill:var(--elec)">${soc == null ? "—" : Math.round(soc) + "%"}</text><text x="220" y="110" class="fnl" style="fill:var(--muted)">${bp == null ? "" : (bp >= 0 ? "+" : "−") + Math.abs(Math.round(bp)) + " W"}</text></g>`;
    g += node(408, 63, 108, "Van", Wt(use), lOn, "var(--ink)");
    $("flow").innerHTML = g;
    // chart
    const hrs = (this._hist || {}).pw || 24, S = this._series || {};
    if (this._socMode === "solar" && this._pro) this._solarChart(); else {
    $("socTitle").textContent = `Battery, last ${hrs > 24 ? "7 days" : "24 hours"}`;
    $("socLeg").innerHTML = '<i class="lk" style="--k:var(--elec)"></i>Charge <i class="lk" style="--k:var(--sun)"></i>Solar';
    const solarPct = S.solar ? { pts: S.solar.pts.map((p) => ({ t: p.t, v: (p.v / (this._cfg.solar_wp || VCC_SOLAR_WP)) * 100 })) } : null;
    this._lineChart("socChart", [solarPct && { ...solarPct, color: "var(--sun)", fill: true, width: 1.5 }, S.soc && { ...S.soc, color: "var(--elec)" }].filter(Boolean), { lo: 0, hi: 100, unit: "%", hours: hrs, empty: soc == null ? "Battery history appears once the shunt is connected" : "Collecting battery history" });
    }
    // inverter modes
    const inv = this._st("inverter_mode"), names = { on: "On", off: "Off", charger_only: "Charger only", inverter_only: "Inverter only" };
    const opts = inv ? (inv.attributes.options || []) : [];
    const html = opts.map((o) => `<button type="button" data-opt="${$esc(o)}" class="${inv.state === o ? "on" : ""}" aria-pressed="${inv.state === o}">${$esc(names[o] || o.replace(/_/g, " "))}</button>`).join("");
    if ($("invModes").innerHTML !== html) $("invModes").innerHTML = html || `<span class="empty">Inverter not found</span>`;
    $("invNote").textContent = !inv ? "" : { on: "Everything works: 230 V sockets on, and it charges from the hook-up.", off: "Inverter and charger are off. Saves a little power when you don't need 230 V.", charger_only: "Charges from the hook-up, but the 230 V sockets are off when you're not plugged in.", inverter_only: "230 V sockets work from the battery, but it won't charge from the hook-up." }[inv.state] || "";
    const lim = this._st("shore_limit"), lv = lim ? num(lim.state) : null;
    $("limV").textContent = lv == null ? "—" : `${Math.round(lv)} A`;
    this.shadowRoot.querySelectorAll("[data-lim]").forEach((b) => { b.disabled = lv == null; });
    // battery details
    const bv = n("batt_voltage"), ba = n("batt_current");
    $("bV").textContent = bv == null ? "—" : `${bv.toFixed(2)} V`; $("bA").textContent = ba == null ? "—" : `${ba.toFixed(1)} A`;
    $("bW").textContent = bp == null ? "—" : `${bp > 0 ? "+" : ""}${Math.round(bp)} W`;
    $("bT").textContent = bp != null && bp > 5 ? "Charging" : ttg ? `${Math.floor(ttg / 3600)}h ${pad2(Math.round((ttg % 3600) / 60))}m` : "—";
    $("bS").textContent = st == null ? "—" : `${st.toFixed(2)} kWh`; $("bD").textContent = Wt(dc);
  }
  _renderClimate() {
    if (!this._ready) return;
    const $ = this.$, n = (k) => this._n(k), T = (v, d = 1) => (v == null ? "—" : `${v.toFixed(d)}°`);
    const cab = n("cabin_temp"), hum = n("cabin_humidity"), out = n("outside_temp"), hw = n("hot_water"), fr = n("fridge_temp"), heat = this._on("heater_running");
    $("cCab").textContent = T(cab); $("cCabS").textContent = hum == null ? "" : `humidity ${Math.round(hum)}%`;
    const wx = this._weather; const o = out != null ? out : wx && wx.temp != null ? wx.temp : null;
    $("cOut").textContent = T(o); $("cOutS").textContent = out != null ? "sensor" : o != null ? "from the forecast" : "";
    $("cHw").textContent = T(hw, 0); $("cHwS").textContent = hw == null ? "Not set up" : hw >= 45 ? "Ready for a shower" : "Warming";
    $("cHeat").textContent = heat == null ? "—" : heat ? "Running" : "Off"; $("cHeat").className = heat ? "hc" : ""; $("cHeatS").textContent = heat == null ? "Not set up" : "";
    $("cFr").textContent = T(fr, 0); $("cFrS").textContent = fr == null ? "No sensor yet" : fr > 7 ? "Warmer than it should be" : "OK";
    $("clState").textContent = heat ? "Heating" : cab == null ? "No inside sensor yet" : cab < 15 ? "Chilly inside" : "Comfortable";
    $("clDot").style.background = heat ? "var(--heat)" : "";
    const hrs = (this._hist || {}).cl || 24, S = this._series || {};
    $("tmpTitle").textContent = `Temperature, last ${hrs > 24 ? "7 days" : "24 hours"}`;
    const all = [...((S.cabin_temp || {}).pts || []), ...((S.outside_temp || {}).pts || [])].map((p) => p.v);
    const lo = all.length ? Math.floor(Math.min(...all) / 5) * 5 : 0, hi = all.length ? lo + Math.max(10, Math.ceil((Math.max(...all) - lo) / 10) * 10) : 30;
    this._lineChart("tmpChart", [S.outside_temp && { ...S.outside_temp, color: "var(--muted)", dash: true, width: 1.5 }, S.cabin_temp && { ...S.cabin_temp, color: "var(--heat)" }].filter(Boolean), { lo, hi, unit: "°", hours: hrs, empty: "Temperature history appears once the inside sensor is fitted" });
    // tanks
    const fresh = n("fresh"), waste = n("waste"), litres = this.E.fresh_litres || 100;
    $("tkFresh").style.setProperty("--p", `${clamp(fresh || 0, 0, 100)}%`); $("tkWaste").style.setProperty("--p", `${clamp(waste || 0, 0, 100)}%`);
    $("tkFreshV").textContent = fresh == null ? "—" : `${Math.round(fresh)}%`; $("tkWasteV").textContent = waste == null ? "—" : `${Math.round(waste)}%`;
    $("tkFreshS").textContent = fresh == null ? "" : `about ${Math.round((fresh / 100) * litres)} L left`;
    $("tkWasteS").textContent = waste == null ? "" : waste > 85 ? "Empty it soon" : waste > 60 ? "Getting full" : "Plenty of room";
    $("tankNote").textContent = fresh != null && fresh < 15 ? "Fill up soon" : "";
    // comfort
    $("cHum").textContent = hum == null ? "—" : `${Math.round(hum)}%`;
    let dew = null;
    if (cab != null && hum != null && hum > 0) { const a = 17.62, b = 243.12, gm = Math.log(hum / 100) + (a * cab) / (b + cab); dew = (b * gm) / (a - gm); }
    $("cDew").textContent = T(dew);
    const risk = dew == null || o == null ? null : o <= dew ? "High" : o - dew < 3 ? "Medium" : "Low";
    const ce = $("cCond"); ce.textContent = risk == null ? "—" : risk === "High" ? "High · open a vent" : risk; ce.className = risk === "High" ? "hc" : risk === "Low" ? "okc" : "";
    $("cDiff").textContent = cab == null || o == null ? "—" : `${cab - o >= 0 ? "+" : "−"}${Math.abs(cab - o).toFixed(1)}°`;
  }


  /* --- heating page --- */
}


/* =====================================================================
 * NomadOS settings and the setup wizard
 * The answers live in Home Assistant (the NomadOS integration stores them),
 * so every tablet and phone shows the same dashboard.
 * ===================================================================== */

// NomadOS's own helpers (by unique id) and the dashboard key each one fills
const NOS_OWN = {
  night_mode: "sw_night", heating_mode: "heat_mode", heating_warm_to: "heat_comfort",
  heating_keep_warm_temperature: "heat_keep_temp", heating_battery_guard: "heat_min_soc",
  heating_keep_warm: "heat_keep", heating_boost: "heat_boost", heater: "thermostat",
};

const SW_ICONS = {
  lights: SWITCHES[4][2], awning: SWITCHES[5][2], pump: SWITCHES[2][2], hot_water: SWITCHES[1][2],
  heater: SWITCHES[0][2], inverter: SWITCHES[3][2], night: SWITCHES[6][2],
  socket: P("M8 3v5M16 3v5M5 8h14v3a7 7 0 0 1-14 0zM12 18v3"),
  fan: P("M12 12c0-4 1-8 4-8s3 4 0 6l-4 2zM12 12c4 0 8 1 8 4s-4 3-6 0l-2-4zM12 12c0 4-1 8-4 8s-3-4 0-6l4-2zM12 12c-4 0-8-1-8-4s4-3 6 0l2 4z"),
  fridge: P("M7 3h10v18H7zM7 10h10M10 6v2M10 13v3"),
  usb: P("M12 3v14M9 6l3-3 3 3M7 11v3l5 3 5-3v-3M12 21a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"),
  power: P("M12 3v9M6.6 6.6a8 8 0 1 0 10.8 0"),
};
const SW_ICON_NAMES = { lights: "Light", awning: "Outside light", pump: "Pump", hot_water: "Hot water", heater: "Heater", socket: "Socket", fan: "Fan", fridge: "Fridge", usb: "USB", power: "Power" };
const NOS_MAX_BUTTONS = 7;

// Common vans: wheelbase and track (width between the wheels) in mm. Close enough for ramp heights.
const NOS_VANS = [
  ["ducato_l23", "Fiat Ducato / Peugeot Boxer / Citroën Relay · L2 or L3", "Ducato L3", 3450, 1810],
  ["ducato_l4", "Fiat Ducato / Peugeot Boxer / Citroën Relay · L4", "Ducato L4", 4035, 1810],
  ["transit_lwb", "Ford Transit · long wheelbase", "Transit LWB", 3750, 1740],
  ["transit_mwb", "Ford Transit · medium wheelbase", "Transit MWB", 3300, 1740],
  ["sprinter_lwb", "Mercedes Sprinter · long wheelbase", "Sprinter LWB", 4325, 1710],
  ["sprinter_mwb", "Mercedes Sprinter · medium wheelbase", "Sprinter MWB", 3665, 1710],
  ["master_mwb", "Renault Master / Vauxhall Movano · medium wheelbase", "Master MWB", 3682, 1750],
  ["crafter_lwb", "VW Crafter / MAN TGE · long wheelbase", "Crafter LWB", 4490, 1720],
  ["crafter_mwb", "VW Crafter / MAN TGE · medium wheelbase", "Crafter MWB", 3640, 1720],
  ["transporter_lwb", "VW Transporter · long wheelbase", "Transporter LWB", 3400, 1630],
  ["transporter_swb", "VW Transporter · short wheelbase", "Transporter SWB", 3000, 1630],
  ["other", "Something else (type the sizes below)", "Campervan", 3500, 1700],
];

// Every sensor the dashboard can use: what it's called, where to look, and how to spot it
const T = ["°C", "°F"];
const NOS_KEYS = {
  soc: { l: "Battery charge", h: "How full the house battery is", d: ["sensor"], u: ["%"], dc: ["battery"], hint: /(soc|state_of_charge|charge|shunt|bmv|house_batt|leisure)/, not: /(phone|tablet|iphone|ipad|pixel|galaxy|watch|remote|button|door|motion|leak|contact|temperature|humidity|_battery$|battery_level|tag|lock)/ },
  batt_voltage: { l: "Battery voltage", d: ["sensor"], u: ["V"], dc: ["voltage"], hint: /(shunt|bmv|house|leisure|dc_bus|battery_voltage|battery)/, not: /(starter|aux|input|output|mains|ac_|_l[123]|pv|solar_v|panel|phone|mid)/ },
  batt_current: { l: "Battery current", h: "Amps in or out of the battery", d: ["sensor"], u: ["A"], dc: ["current"], hint: /(shunt|bmv|battery|dc_bus)/, not: /(input|output|pv|_l[123]|limit|max)/ },
  batt_power: { l: "Battery power", h: "Watts in or out of the battery", d: ["sensor"], u: ["W", "kW"], dc: ["power"], hint: /(shunt|bmv|battery)/, not: /(pv|solar|input|output|consumption|_l[123]|max)/ },
  time_to_go: { l: "Time left", h: "How long the battery lasts at this rate", d: ["sensor"], u: ["s", "min", "h"], dc: ["duration"], hint: /(time.?to.?go|time_remaining|remaining)/ },
  solar: { l: "Solar power now", d: ["sensor"], u: ["W", "kW"], dc: ["power"], hint: /(pv|solar|mppt)/, not: /(max|limit|today|yesterday|forecast)/ },
  solar_today: { l: "Solar made today", d: ["sensor"], u: ["kWh", "Wh"], dc: ["energy"], hint: /(yield_today|solar.*today|pv.*today|mppt.*today)/, not: /(yesterday|forecast)/ },
  ac_load: { l: "Mains things using", h: "230 V sockets and appliances", d: ["sensor"], u: ["W", "kW"], dc: ["power"], hint: /(consumption|ac_load|ac_out|output_power|critical_load)/, not: /(dc|input|pv|solar|battery|max)/ },
  dc_load: { l: "12 V things using", d: ["sensor"], u: ["W", "kW"], dc: ["power"], hint: /(dc_consumption|dc_system|dc_load)/ },
  shore_power: { l: "Hook-up power", h: "Power coming in from a campsite hook-up", d: ["sensor"], u: ["W", "kW"], dc: ["power"], hint: /(input.*power|ac_in.*power|grid|shore|hook)/, not: /(pv|solar|output|dc)/ },
  shore_voltage: { l: "Hook-up voltage", h: "Shows whether a hook-up lead is plugged in", d: ["sensor"], u: ["V"], dc: ["voltage"], hint: /(input.*voltage|ac_in.*voltage|grid.*voltage|shore)/, not: /(battery|dc|output|pv)/ },
  alternator: { l: "Charging from driving", h: "DC-DC charger (Victron Orion, Renogy, CTEK and others)", d: ["sensor"], u: ["W", "kW"], dc: ["power"], hint: /(orion|alternator|dc_?dc|b2b)/, not: /input/ },
  inverter_mode: { l: "Inverter switch", h: "Lets the screen turn the inverter on and off", d: ["select", "switch"], hint: /(multiplus|vebus|quattro|inverter)/, not: /(limit|charger_only)/ },
  shore_limit: { l: "Hook-up limit", h: "Turn it down on a weak campsite supply", d: ["number"], hint: /(current_limit|input_current|ac_in.*limit)/ },
  fresh: { l: "Fresh water tank", d: ["sensor"], u: ["%"], hint: /(fresh|clean|potable)/, not: /(waste|grey|gray|black)/ },
  waste: { l: "Waste water tank", d: ["sensor"], u: ["%"], hint: /(waste|grey|gray)/ },
  cabin_temp: { l: "Inside temperature", d: ["sensor"], u: T, dc: ["temperature"], strict: true, hint: /(cabin|inside|living|indoor|lounge|interior|van_temp|bedroom|habitation)/, not: /(outside|outdoor|exterior|external|fridge|freezer|cpu|processor|battery|water|engine|coolant|mppt|charger|inverter|multiplus|orion|shunt|garage|dog)/ },
  cabin_humidity: { l: "Inside humidity", d: ["sensor"], u: ["%"], dc: ["humidity"], strict: true, hint: /(cabin|inside|living|indoor|lounge|interior|van|habitation)/, not: /(outside|outdoor|exterior)/ },
  outside_temp: { l: "Outside temperature", d: ["sensor", "weather"], u: T, dc: ["temperature"], strict: true, hint: /(outside|outdoor|exterior|external|ambient)/ },
  fridge_temp: { l: "Fridge temperature", d: ["sensor"], u: T, dc: ["temperature"], strict: true, hint: /(fridge|freezer|cool.?box)/ },
  hot_water: { l: "Hot water temperature", d: ["sensor"], u: T, dc: ["temperature"], strict: true, hint: /(hot.?water|boiler|calorifier|water_heater)/, not: /(fresh|waste)/ },
  heater_running: { l: "Heater running", h: "Shows the diesel heater is on, if your heater reports it", d: ["binary_sensor"], hint: /(heater)/ },
  sw_heater: { l: "Heater switch", h: "The smart relay that starts and stops your heater", d: ["switch", "input_boolean"], hint: /(heater|webasto|eberspacher|autoterm|planar|diesel)/, not: /(water|hot|nomados)/ },
  pitch: { l: "Tilt front to back", d: ["sensor"], u: ["°"], hint: /pitch/ },
  roll: { l: "Tilt side to side", d: ["sensor"], u: ["°"], hint: /roll/ },
  heading: { l: "Compass heading", d: ["sensor"], u: ["°"], hint: /(heading|compass|bearing|course)/ },
  fuel: { l: "Fuel level", d: ["sensor"], u: ["%"], hint: /(fuel)/, not: /(range|used|price)/ },
  fuel_range: { l: "Range", d: ["sensor"], u: ["mi", "km"], dc: ["distance"], hint: /(range)/ },
  speed: { l: "Speed", d: ["sensor"], u: ["mph", "km/h"], dc: ["speed"], hint: /(speed)/, not: /(wind|fan|gust|internet|download|upload)/ },
  engine_running: { l: "Engine running", d: ["binary_sensor"], hint: /(engine|ignition)/ },
  starter_voltage: { l: "Starter battery", d: ["sensor"], u: ["V"], dc: ["voltage"], hint: /(starter|engine_batt|vehicle_batt|obd|car_batt|aux)/ },
  fault_codes: { l: "Fault codes", h: "A count of engine fault codes", d: ["sensor"], hint: /(fault|dtc|trouble|mil)/ },
  location: { l: "Where the van is", h: "A GPS tracker: your 4G router, the OBD reader or your phone. Without one, it uses your Home location", d: ["device_tracker"], hint: /(van|router|gps|rut|teltonika|gl_|car|vehicle|wican|obd)/ },
  pi_temp: { l: "Computer temperature", h: "From the System Monitor integration", d: ["sensor"], u: T, dc: ["temperature"], strict: true, hint: /(processor|cpu|soc_temp)/ },
  internet: { l: "Internet connection", d: ["binary_sensor"], hint: /(internet|wan|online|connectivity)/ },
  weather_warning: { l: "Weather warnings", h: "For example the Met Office or MeteoAlarm integration", d: ["sensor", "binary_sensor"], hint: /(warning|alert|meteoalarm|met_office)/, not: /(fuse|leak|smoke|co_)/ },
};

const NOS_STEPS = {
  welcome: { t: "Welcome" },
  van: { t: "Your van" },
  kit: { t: "What's fitted" },
  pro: { t: "NomadOS Pro" },
  power: { t: "Battery & solar", keys: ["soc", "batt_voltage", "batt_current", "batt_power", "time_to_go", "solar", "solar_today", "ac_load", "dc_load", "shore_power", "shore_voltage", "alternator", "inverter_mode", "shore_limit"], f: "power" },
  water: { t: "Water", keys: ["fresh", "waste"], f: "water" },
  climate: { t: "Climate", keys: ["cabin_temp", "cabin_humidity", "outside_temp", "fridge_temp", "hot_water", "heater_running"], f: "climate" },
  heating: { t: "Heating", keys: ["sw_heater"], f: "heating" },
  switches: { t: "Buttons" },
  fuses: { t: "Fuses", f: "fuses" },
  level: { t: "Level", keys: ["pitch", "roll", "heading"], f: "level" },
  trips: { t: "Fuel & trips", keys: ["fuel", "fuel_range", "speed", "engine_running", "starter_voltage", "fault_codes"], f: "trips" },
  extras: { t: "Extras", keys: ["location", "pi_temp", "internet", "weather_warning"] },
  finish: { t: "Finish" },
};

const NOS_FEATURES = [
  ["power", "Battery & solar", "Victron through a Cerbo or other GX device, or any battery monitor"],
  ["water", "Water tanks", "Fresh and waste tank level sensors"],
  ["climate", "Temperature sensors", "Inside, outside and fridge (Zigbee or Wi-Fi)"],
  ["heating", "Heater on a smart relay", "A Shelly or similar on the diesel heater, for heating times and boost", true],
  ["fuses", "Fuse alerts", "Spots a blown fuse from your Victron kit, or a fuse sensor box", true],
  ["level", "Level & compass", "A tilt sensor, for ramp heights when you park", true],
  ["trips", "Fuel & trips", "An OBD reader such as the WiCAN", true],
];

// Victron devices that measure the battery voltage themselves, so a dead fuse shows up
const NOS_FUSE_GUESS = [
  { label: "Inverter", re: /^sensor\..*(multiplus|vebus|quattro|inverter|phoenix).*(dc.?voltage|battery.?voltage|_voltage)$/, not: /(input|output|_l[123]|ac_|mains)/, skip: "inverter_mode", rating: "" },
  { label: "Solar charger", re: /^sensor\..*(mppt|smartsolar|solar_charger|bluesolar).*(battery.?voltage|_voltage)$/, not: /(pv|panel|input)/, rating: "" },
  { label: "Alternator charger", re: /^sensor\..*(orion|dc_?dc|b2b).*(output.?voltage)$/, rating: "" },
];

const nosSlug = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40) || "fuse";
const nosClone = (o) => JSON.parse(JSON.stringify(o || {}));

const WZ_CSS = `
[hidden]{display:none!important}
.cog{all:unset;cursor:pointer;width:26px;height:26px;color:var(--muted);display:inline-grid;place-items:center;margin-left:6px;border-radius:6px}
.cog svg{width:17px;height:17px}.cog:hover{color:var(--tan)}.cog:focus-visible{outline:2px solid var(--amber)}
.wz{position:absolute;inset:0;z-index:40;background:inherit;display:grid;grid-template-rows:64px 1fr 74px;color:var(--ink);font-family:var(--body)}
.wz .lh .brand{font-family:var(--stencil);font-weight:800;font-size:15px;letter-spacing:.14em;color:#11120c;background:var(--olive);padding:4px 10px 3px;border-radius:4px}
.wzc{font:500 11px var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
.wzb{display:grid;grid-template-columns:236px 1fr;min-height:0}
.wzr{border-right:1px solid var(--hair);padding:24px 0 24px 32px;display:grid;align-content:start;gap:2px;background:linear-gradient(90deg,#0D0E0Fd0,#0D0E0F90)}
.wzr span{font:500 10.5px var(--mono);letter-spacing:.09em;text-transform:uppercase;color:#5f5b55;padding:8px 0;display:flex;gap:12px;align-items:center}
.wzr span i{width:18px;height:6px;border-radius:2px;background:#24231f;box-shadow:inset 0 1px 2px #000c,0 0 0 1px #3a3833;flex:none}
.wzr span.done{color:var(--muted)}.wzr span.done i{background:var(--olive)}
.wzr span.cur{color:var(--tan)}.wzr span.cur i{background:var(--amber)}
.wzm{padding:26px 40px 30px;overflow:auto;min-height:0;display:grid;align-content:start;gap:16px;scrollbar-color:#3a3833 transparent}
.wzh{font-family:var(--stencil);font-weight:800;font-size:42px;letter-spacing:.05em;text-transform:uppercase;line-height:.95;margin:0}
.wzk{font:500 10.5px var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--tan);margin:0}
.wzp{margin:0;color:#C9C2B6;font-size:15.5px;line-height:1.5;max-width:780px}
.wzp b{color:var(--ink)}
.wzf{display:flex;align-items:center;gap:14px;padding:0 32px;border-top:1px solid #2e2f31;background:linear-gradient(#18191b,#111214)}
.wzf .hb{font-size:13px;padding:14px 24px}
.wzmsg{flex:1;font-size:14px;color:var(--muted)}.wzmsg.err{color:var(--heat)}
.wzg{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.wzt{all:unset;box-sizing:border-box;cursor:pointer;display:grid;gap:7px;align-content:start;padding:14px 15px 15px;border-radius:11px;background:linear-gradient(#1c1d20,#151618);box-shadow:inset 0 1px 0 #ffffff10,inset 0 -2px 0 #0007,0 2px 5px #0009;min-height:138px}
.wzt:active{transform:translateY(1px)}.wzt:focus-visible{outline:2px solid var(--amber);outline-offset:2px}
.wzt .led{width:28px;height:6px;border-radius:2px;background:#24231f;box-shadow:inset 0 1px 2px #000c,0 0 0 1px #3a3833}
.wzt.on .led{background:var(--amber)}
.wzt b{font-family:var(--disp);font-weight:700;font-size:20px;color:#9a958c;line-height:1.1}.wzt.on b{color:var(--ink)}
.wzt small{font-size:12.5px;color:var(--muted);line-height:1.35}
.wzt em{font:normal 500 9.5px var(--mono);letter-spacing:.07em;text-transform:uppercase;color:var(--olive);margin-top:auto}
.wzt em.no{color:#5f5b55}
.wzt.locked{opacity:.75}.wzt.locked b{color:#7d786f}
.wzt em.pro{color:#11120c;background:var(--sun);justify-self:start;padding:2px 7px;border-radius:3px}
.wzul{margin:4px 0 0;padding-left:18px;display:grid;gap:6px;font-size:14px;color:#C9C2B6;line-height:1.4}
.wzl{display:grid;background:#0f1011d9;border:1px solid var(--hair);border-radius:12px;padding:2px 18px}
.wzrow{display:grid;grid-template-columns:1fr 400px 130px;gap:16px;align-items:center;padding:11px 0;border-top:1px solid var(--hair)}
.wzrow:first-child{border-top:0}
.wzrow b{display:block;font-size:15px;font-weight:600}.wzrow small{display:block;font-size:12.5px;color:var(--muted);margin-top:2px;line-height:1.35}
.wzv{text-align:right;font-family:var(--disp);font-size:19px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wzv.dim{color:#5f5b55;font-size:14px;font-family:var(--body);font-weight:400}
.wzv i{display:block;font:normal 500 9px var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--olive)}
.wzs,.wzi{all:unset;box-sizing:border-box;width:100%;font:15px var(--body);color:var(--ink);background:#141517;border-radius:8px;padding:11px 13px;box-shadow:inset 0 0 0 1px var(--hair),inset 0 2px 3px #0008;color-scheme:dark}
.wzs{cursor:pointer;padding-right:36px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;background:#141517 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' fill='none' stroke='%23C8A27A' stroke-width='1.6'/%3E%3C/svg%3E") right 13px center/12px no-repeat}
.wzs option{background:#151618;color:#ECE6DC}
.wzs:focus-visible,.wzi:focus-visible{box-shadow:inset 0 0 0 2px var(--amber)}
.wzs.found{box-shadow:inset 0 0 0 1px #7D8457,inset 0 2px 3px #0008}
.wz2{display:grid;grid-template-columns:1fr 1fr;gap:18px;align-items:start}
.wz3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
.wzfld{display:grid;gap:7px}.wzfld>span{font:500 10px var(--mono);letter-spacing:.09em;text-transform:uppercase;color:var(--tan)}
.wzfld small{font-size:12.5px;color:var(--muted)}
.wzpics{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.wzpic{all:unset;box-sizing:border-box;cursor:pointer;display:grid;gap:8px;padding:12px;border-radius:11px;background:linear-gradient(#1c1d20,#151618);box-shadow:inset 0 1px 0 #ffffff10,inset 0 -2px 0 #0007,0 2px 5px #0009}
.wzpic.on{box-shadow:inset 0 0 0 2px var(--amber),0 2px 5px #0009}
.wzpic .im{height:150px;border-radius:7px;background:#0d0e0f center/contain no-repeat;display:grid;place-items:center;color:var(--muted);font-size:13px;text-align:center;padding:10px}
.wzpic b{font-size:14px}.wzpic small{font-size:12px;color:var(--muted)}
.wzplate{justify-self:start;font-family:var(--stencil);font-weight:800;font-size:30px;letter-spacing:.14em;color:#11120c;background:var(--olive);padding:6px 16px 4px;border-radius:6px;box-shadow:inset 0 0 0 1px #00000040;min-width:120px;text-align:center}
.wzsw{display:grid;grid-template-columns:36px 1fr 220px 170px 92px;gap:12px;align-items:center;padding:10px 0;border-top:1px solid var(--hair)}
.wzsw:first-child{border-top:0}
.wzsw .si{width:26px;height:26px;color:var(--tan)}.wzsw .si svg{width:26px;height:26px}
.wzsw .fixed{font-size:15px}.wzsw .fixed small{display:block;color:var(--muted);font-size:12.5px}
.wzfz{display:grid;grid-template-columns:1fr 1.3fr 110px 92px;gap:12px;align-items:center;padding:10px 0;border-top:1px solid var(--hair)}
.wzfz:first-child{border-top:0}
.wzbtns{display:flex;gap:10px;flex-wrap:wrap}
.wzx{all:unset;cursor:pointer;font:500 10px var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--muted);padding:8px 10px;border-radius:7px;box-shadow:inset 0 0 0 1px var(--hair);text-align:center}
.wzx:hover{color:var(--heat)}
.wzsum{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
.wzsum .tp b{font-family:var(--disp);font-size:20px}
.wzsum .tp p{margin:0;font-size:13.5px;color:var(--muted);line-height:1.45}
.wzbig{display:grid;grid-template-columns:1fr 400px;gap:40px;align-items:center;padding-top:20px}
.wzbig ul{margin:0;padding:0;list-style:none;display:grid;gap:12px}
.wzbig li{display:grid;grid-template-columns:28px 1fr;gap:12px;font-size:15.5px;color:#C9C2B6;line-height:1.45}
.wzbig li i{font:600 11px var(--mono);color:#11120c;background:var(--olive);border-radius:4px;height:22px;display:grid;place-items:center}
.wzbig img{width:100%;filter:drop-shadow(0 18px 24px #000c)}
.wzwarn{border:1px solid #E8833A66;background:#E8833A14;border-radius:10px;padding:12px 16px;font-size:14px;color:#E9D6C3;line-height:1.45}
`;

const NOS_METHODS = {
  /* ---------- loading the settings ---------- */
  async _loadNomad() {
    if (this._nosLoading || !this._hass) return;
    this._nosLoading = true;
    try {
      const r = await this._hass.callWS({ type: "nomados/config" });
      await this._loadPro(r);
      this._applyNomad(r);
    } catch (e) {
      // The NomadOS integration isn't added (or is still starting): show what the page config says
      console.warn("NomadOS: settings not available", e);
      this._nos = { failed: true, config: {}, own: {} };
    }
    this._nosLoading = false;
    this._init();
  },
  async _loadPro(r) {
    const pro = r && r.pro;
    if (!pro || !pro.url || window.__nomados.pro) { this._pro = !!window.__nomados.pro; return; }
    try { await import(pro.url); } catch (e) { console.warn("NomadOS: Pro didn't load", e); }
    this._pro = !!window.__nomados.pro;
  },
  _applyNomad(r) {
    const c = r.config || {};
    this._nos = r;
    const base = this._baseCfg || (this._baseCfg = { ...this._cfg });
    const ent = { ...(c.entities || {}) };
    Object.entries(r.own || {}).forEach(([k, id]) => { if (NOS_OWN[k]) ent[NOS_OWN[k]] = id; });
    if ((c.features || {}).heating) ent.heat_schedule = ent.heat_schedule || "schedule.nomados_heating";
    (c.switches || []).forEach((s, i) => { if (s.entity) ent[`sw_u${i}`] = s.entity; });
    ent.fresh_litres = Number(c.fresh_litres) || 100;
    const van = c.van || {};
    this._cfg = {
      ...base, entities: ent, plate: van.plate || "VAN", photo: c.photo || null,
      battery_wh: Number(c.battery_wh) || undefined, solar_wp: Number(c.solar_wp) || undefined,
      wheelbase_mm: Number(van.wheelbase_mm) || undefined, track_mm: Number(van.track_mm) || undefined,
      fuel_price: Number(c.fuel_price) || undefined, features: c.features || {}, switches: c.switches || null,
      setup_done: !!c.setup_done, vehicle: van.short || "",
    };
    this._found = {};
  },
  _switchList() {
    const list = this._nos && !this._nos.failed && this._cfg.switches;
    if (!list) return SWITCHES;
    return list.map((s, i) => {
      if (s.special === "heater") return ["sw_heater", s.name || "Heater", SW_ICONS.heater, "heater"];
      if (s.special === "inverter") return ["inverter_mode", s.name || "Inverter", SW_ICONS.inverter, "inverter"];
      if (s.special === "night") return ["sw_night", s.name || "Night", SW_ICONS.night, "night"];
      return [`sw_u${i}`, s.name || "Switch", SW_ICONS[s.icon] || SW_ICONS.power, s.icon || ""];
    });
  },
  _applyFeatures() {
    const $ = this.$, c = this._cfg;
    if (!this._nos || this._nos.failed) return;
    const cog = $("nosSetup");
    if (this._nos.is_admin) { cog.hidden = false; cog.addEventListener("click", () => this._wzOpen()); }
    if (c.vehicle) $("vehLabel").textContent = `Veh 01 · ${c.vehicle}`;
    const f = c.features || {};
    if (!this._pro) ["heating", "fuses", "level", "trips"].forEach((k) => { f[k] = false; });
    if (!this._pro) { this.shadowRoot.querySelectorAll(".tabs button").forEach((b, i) => { if (i) b.hidden = true; }); $("socMode").hidden = true; }
    const show = (ids, on) => ids.forEach((id) => { const el = $(id); if (el) el.hidden = !on; });
    show(["htOpen", "clToHeat"], !!f.heating);
    show(["fuOpen"], !!f.fuses);
    show(["tripsOpen", "tripsGrp"], !!f.trips);
    show(["lvlOpen"], !!f.level);
    show(["waGrp"], !!f.water);
    if (!c.setup_done) setTimeout(() => this._wzOpen(), 0);
  },

  /* ---------- finding the owner's kit ---------- */
  _nosCands(key) {
    const k = NOS_KEYS[key], S = (this._hass && this._hass.states) || {}, out = [];
    const rule = VCC_DISCOVER[key];
    for (const [id, st] of Object.entries(S)) {
      const dom = id.split(".")[0];
      if (!k.d.includes(dom) || /\.nomados_/.test(id)) continue;
      const a = st.attributes || {}, u = a.unit_of_measurement, dc = a.device_class;
      if (dom === "sensor" && (k.u || k.dc)) {
        const okDc = k.dc && k.dc.includes(dc), okU = k.u && k.u.includes(u);
        if (k.strict ? !(okDc || (okU && !dc)) : !(okDc || okU)) continue;
      }
      if (dom === "weather" && key !== "outside_temp") continue;
      const name = String(a.friendly_name || id), hay = `${id} ${name.toLowerCase().replace(/[\s-]+/g, "_")}`;
      let sc = 0;
      if (rule && rule.re.test(id) && !(rule.not && rule.not.test(id))) sc += 10;
      if (k.hint && k.hint.test(hay)) sc += 5;
      if (k.not && k.not.test(hay)) sc -= 8;
      if (!["unavailable", "unknown"].includes(st.state)) sc += 1;
      if (k.d.length > 1 && dom === k.d[0]) sc += 2; // a real switch beats a helper with the same name
      out.push({ id, name, sc });
    }
    return out.sort((x, y) => y.sc - x.sc || x.name.localeCompare(y.name));
  },
  _nosVal(id) {
    const st = id && this._hass && this._hass.states[id];
    if (!st) return null;
    if (id.startsWith("weather.")) return st.attributes.temperature != null ? `${st.attributes.temperature}°` : st.state;
    if (id.startsWith("device_tracker.")) return st.attributes.latitude != null ? "GPS" : st.state;
    const n = num(st.state), u = st.attributes.unit_of_measurement || "";
    if (n == null) return ["unavailable", "unknown"].includes(st.state) ? "No reading" : String(st.state).replace(/_/g, " ");
    const d = Math.abs(n) < 100 && n % 1 ? 1 : 0;
    return `${n.toFixed(d)}${u === "%" || u.startsWith("°") ? "" : " "}${u}`;
  },
  _wzAuto(d) {
    const used = new Set(Object.values(d.entities || {}).filter(Boolean));
    const auto = new Set();
    Object.values(NOS_STEPS).forEach((s) => (s.keys || []).forEach((key) => {
      if (key in d.entities) return;
      const best = this._nosCands(key).find((c) => !used.has(c.id));
      if (best && best.sc >= 5) { d.entities[key] = best.id; used.add(best.id); auto.add(key); }
      else d.entities[key] = "";
    }));
    const e = d.entities, S = this._hass.states;
    if (!d.features_set) {
      d.features = {
        power: !!(e.soc || e.batt_voltage), water: !!(e.fresh || e.waste), climate: !!(e.cabin_temp || e.outside_temp),
        heating: false, fuses: false, level: !!(e.pitch && e.roll) && !!this._pro, trips: !!e.fuel && !!this._pro,
      };
    }
    // Fuse suggestions: Victron devices that measure the battery themselves, plus any fuse sense wires
    if (!d.fuses) {
      const fz = [];
      NOS_FUSE_GUESS.forEach((g) => {
        const id = Object.keys(S).sort().find((x) => g.re.test(x) && !(g.not && g.not.test(x)));
        if (id) fz.push({ check: "victron", label: g.label, entity: id, rating: g.rating, skip_when_off: g.skip && e[g.skip] ? e[g.skip] : "" });
      });
      Object.keys(S).filter((x) => x.startsWith("binary_sensor.") && /fuse/.test(x) && !/nomados/.test(x)).sort().forEach((id) => {
        const nm = String(S[id].attributes.friendly_name || id).replace(/fuse|sense|circuit/gi, "").replace(/\s+/g, " ").trim();
        fz.push({ check: "sense", label: nm || "Circuit", entity: id, rating: "10 A" });
      });
      d.fuses = fz;
      if (!d.features_set && fz.length && e.batt_voltage && this._pro) d.features.fuses = true;
    }
    // Buttons: heater, inverter, then any lights, pump and hot water relays, then Night
    if (!d.switches) {
      const sw = [];
      if (d.features.heating) sw.push({ special: "heater", name: "Heater" });
      if (e.inverter_mode) sw.push({ special: "inverter", name: "Inverter" });
      const taken = new Set([e.sw_heater, e.inverter_mode]);
      const guess = [[/(awning|outside_light|porch)/, "awning", "Awning light"], [/(light|lamp|led|spot)/, "lights", "Lights"], [/(pump)/, "pump", "Pump"], [/(hot_?water|boiler|immersion|calorifier)/, "hot_water", "Hot water"], [/(fridge)/, "fridge", "Fridge"], [/(fan|maxx|extract)/, "fan", "Fan"]];
      const ids = Object.keys(S).filter((x) => /^(switch|light|fan)\./.test(x) && !/nomados|_led_indication|_child_lock|_backlight|_identify/.test(x)).sort();
      guess.forEach(([re, icon, name]) => {
        ids.filter((x) => !taken.has(x) && re.test(`${x} ${String(S[x].attributes.friendly_name || "").toLowerCase()}`)).slice(0, icon === "lights" ? 2 : 1).forEach((x) => {
          if (sw.length < this._wzMax() - 1) { sw.push({ entity: x, name: icon === "lights" && sw.some((s) => s.icon === "lights") ? String(S[x].attributes.friendly_name || name).slice(0, 14) : name, icon }); taken.add(x); }
        });
      });
      sw.push({ special: "night", name: "Night" });
      d.switches = sw;
    }
    return auto;
  },

  /* ---------- the wizard ---------- */
  _wzOpen() {
    if (!this._hass || !this.$) return;
    const c = (this._nos && this._nos.config) || {};
    const d = nosClone(c);
    d.van = d.van || {}; d.entities = d.entities || {};
    if (!d.van.model) { d.van.model = "other"; const p = NOS_VANS[NOS_VANS.length - 1]; d.van.wheelbase_mm = p[3]; d.van.track_mm = p[4]; d.van.short = p[2]; }
    if (d.van.plate == null) d.van.plate = "";
    if (d.battery_ah == null) { d.battery_ah = 200; d.battery_v = 12.8; }
    if (d.solar_wp == null) d.solar_wp = 400;
    if (d.fresh_litres == null) d.fresh_litres = 100;
    const auto = this._wzAuto(d);
    const first = !c.setup_done;
    this._wz = { d, i: first ? 0 : 1, first, auto };
    let el = this.$("wz");
    if (!el) {
      el = document.createElement("div"); el.className = "wz"; el.id = "wz";
      this.$("scr").appendChild(el);
      this._wzWire(el);
    }
    el.hidden = false;
    this._wzRender();
  },
  _wzClose() { const el = this.$("wz"); if (el) el.hidden = true; this._wz = null; },
  _wzSteps() {
    const f = this._wz.d.features || {};
    return Object.keys(NOS_STEPS).filter((k) => !NOS_STEPS[k].f || f[NOS_STEPS[k].f]);
  },
  _wzRender() {
    const w = this._wz, steps = this._wzSteps();
    w.i = clamp(w.i, 0, steps.length - 1);
    const cur = steps[w.i];
    const prev = this.$("wzMain"), keep = prev && this._wzLast === cur ? prev.scrollTop : 0;
    this._wzLast = cur;
    const rail = steps.map((s, i) => `<span class="${i < w.i ? "done" : i === w.i ? "cur" : ""}"><i></i>${$esc(NOS_STEPS[s].t)}</span>`).join("");
    const isAdmin = this._nos && this._nos.is_admin;
    const body = !isAdmin ? this._wzNotAdmin() : this[`_wz_${cur}`]();
    const last = cur === "finish";
    this.$("wz").innerHTML = `
     <header class="lh"><span class="brand">NomadOS</span><span class="lt2">Setup</span><span class="wzc">${w.i + 1} of ${steps.length} · ${$esc(NOS_STEPS[cur].t)}</span>
      <button type="button" class="lx" data-wz="close"${w.first ? " hidden" : ""}>Close</button></header>
     <div class="wzb"><nav class="wzr" aria-label="Setup steps">${rail}</nav><section class="wzm" id="wzMain">${body}</section></div>
     <footer class="wzf"><button type="button" class="hb" data-wz="back"${w.i === 0 || !isAdmin ? " disabled" : ""}>Back</button><span class="wzmsg" id="wzMsg"></span>
      <button type="button" class="hb pri" data-wz="${last ? "save" : "next"}"${!isAdmin ? " disabled" : ""}>${w.i === 0 ? "Start" : last ? "Finish and open my dashboard" : "Next"}</button></footer>`;
    const m = this.$("wzMain"); if (m) m.scrollTop = keep;
  },
  _wzMsg(t, err) { const el = this.$("wzMsg"); if (el) { el.textContent = t || ""; el.classList.toggle("err", !!err); } },
  _wzWire(el) {
    el.addEventListener("click", (ev) => {
      const b = ev.target.closest("[data-wz],[data-feat],[data-pic]"); if (!b || !this._wz) return;
      const w = this._wz, d = w.d;
      if (b.dataset.feat) { d.features[b.dataset.feat] = !d.features[b.dataset.feat]; d.features_set = true; this._wzRender(); this._wzGo(2); return; }
      if (b.dataset.pic === "sample") { d.photo = null; this._wzRender(); return; }
      if (b.dataset.pic === "upload") { const f = this.$("wzFile"); if (f) f.click(); return; }
      const act = b.dataset.wz, i = Number(b.dataset.i);
      if (act === "close") this._wzClose();
      else if (act === "back") { w.i--; this._wzRender(); }
      else if (act === "next") { w.i++; this._wzRender(); }
      else if (act === "save") this._wzSave();
      else if (act === "topro") { w.i = this._wzSteps().indexOf("pro"); this._wzRender(); }
      else if (act === "profile") { const f = this.$("wzProFile"); if (f) f.click(); }
      else if (act === "swdel") { d.switches.splice(i, 1); this._wzRender(); this._wzGo(); }
      else if (act === "swup" && i > 0) { const s = d.switches; [s[i - 1], s[i]] = [s[i], s[i - 1]]; this._wzRender(); this._wzGo(); }
      else if (act === "swadd") { d.switches.splice(this._wzNightAt(), 0, { entity: "", name: "", icon: "lights" }); this._wzRender(); this._wzGo(); }
      else if (act === "swspecial") { d.switches.splice(b.dataset.s === "night" ? d.switches.length : 0, 0, { special: b.dataset.s, name: { heater: "Heater", inverter: "Inverter", night: "Night" }[b.dataset.s] }); this._wzRender(); this._wzGo(); }
      else if (act === "fzdel") { d.fuses.splice(i, 1); this._wzRender(); this._wzGo(); }
      else if (act === "fzadd") { d.fuses.push({ check: b.dataset.c, label: "", entity: "", rating: b.dataset.c === "sense" ? "10 A" : "" }); this._wzRender(); this._wzGo(); }
    });
    const onField = (ev) => {
      const t = ev.target; if (!this._wz) return;
      const d = this._wz.d;
      if (t.dataset.ent) {
        d.entities[t.dataset.ent] = t.value; this._wz.auto.delete(t.dataset.ent);
        t.classList.remove("found");
        const v = this.shadowRoot.querySelector(`[data-live="${t.dataset.ent}"]`); if (v) v.outerHTML = this._wzLiveHtml(t.dataset.ent);
      } else if (t.dataset.f) {
        const [a, b] = t.dataset.f.split(".");
        const val = t.type === "number" ? (t.value === "" ? null : Number(t.value)) : t.value;
        if (b) { d[a] = d[a] || {}; d[a][b] = val; } else d[a] = val;
        if (t.dataset.f === "van.plate") { const p = this.$("wzPlate"); if (p) p.textContent = (t.value || "VAN").toUpperCase(); }
        if (t.dataset.f === "van.model" && ev.type === "change") {
          const p = NOS_VANS.find((v) => v[0] === t.value);
          if (p) { d.van.wheelbase_mm = p[3]; d.van.track_mm = p[4]; d.van.short = p[2]; this._wzRender(); this._wzGo(); }
        }
      } else if (t.dataset.sw != null) {
        const s = d.switches[Number(t.dataset.sw)]; s[t.dataset.k] = t.value;
        if (t.dataset.k === "entity" && !s.name && t.value) { const st = this._hass.states[t.value]; s.name = String((st && st.attributes.friendly_name) || "").slice(0, 14); this._wzRender(); this._wzGo(); }
        if (t.dataset.k === "icon" && ev.type === "change") { this._wzRender(); this._wzGo(); }
      } else if (t.dataset.fz != null) {
        d.fuses[Number(t.dataset.fz)][t.dataset.k] = t.value;
      }
    };
    el.addEventListener("input", onField);
    el.addEventListener("change", (ev) => {
      if (ev.target.id === "wzFile") { this._wzPhoto(ev.target.files && ev.target.files[0]); return; }
      if (ev.target.id === "wzProFile") { this._wzProInstall(ev.target.files && ev.target.files[0]); return; }
      onField(ev);
    });
  },
  _wzGo(i) { /* keep the scroll position after a re-render */ const m = this.$("wzMain"); if (m && this._wzScroll) m.scrollTop = this._wzScroll; },
  _wzMax() { return this._pro ? NOS_MAX_BUTTONS : 5; },
  _wzNightAt() { const s = this._wz.d.switches, n = s.findIndex((x) => x.special === "night"); return n < 0 ? s.length : n; },
  _wzNotAdmin() {
    return `<p class="wzk">Setup</p><h2 class="wzh">Almost ready</h2><p class="wzp">NomadOS hasn't been set up yet, and setting it up needs a Home Assistant administrator. Ask whoever installed Home Assistant to open <b>NomadOS</b> in the sidebar and follow the setup.</p>`;
  },

  /* steps */
  _wz_welcome() {
    return `<div class="wzbig"><div style="display:grid;gap:18px"><p class="wzk">Welcome to NomadOS</p><h2 class="wzh" style="font-size:56px">Let's set up<br>your van</h2>
      <p class="wzp">This takes about five minutes. NomadOS has already looked through Home Assistant for your kit, so most answers are filled in. Check them, change anything that's wrong, and press Next.</p>
      <ul><li><i>1</i><span>Tell it about your van and add a photo.</span></li><li><i>2</i><span>Tick what's fitted: batteries, tanks, heater, sensors.</span></li><li><i>3</i><span>Check the sensors it found and pick your buttons.</span></li></ul>
      <p class="wzp" style="font-size:13.5px;color:var(--muted)">Nothing here changes your wiring or your other Home Assistant settings. You can come back any time with the cog at the top right of the dashboard.</p></div>
      <img src="${this._cfg.photo || (this._cfg.asset_base ? this._cfg.asset_base + "cc-van.webp" : VCC_VAN)}" alt=""></div>`;
  },
  _wz_van() {
    const d = this._wz.d, v = d.van;
    const opts = NOS_VANS.map((p) => `<option value="${p[0]}"${p[0] === v.model ? " selected" : ""}>${$esc(p[1])}</option>`).join("");
    const photo = d.photo;
    return `<p class="wzk">Step 1</p><h2 class="wzh">Your van</h2>
     <div class="wz2"><div style="display:grid;gap:16px">
      <label class="wzfld"><span>Name or number plate</span><input class="wzi" data-f="van.plate" maxlength="14" value="${$esc(v.plate)}" placeholder="For example AB12 CDE, or the van's name"><small>Shown on the plate at the top of the screen. Up to 14 letters.</small></label>
      <div class="wzplate" id="wzPlate">${$esc((v.plate || "VAN").toUpperCase())}</div>
      <label class="wzfld"><span>Van</span><select class="wzs" data-f="van.model">${opts}</select><small>Used to work out ramp heights on the Level page.</small></label>
      <div class="wz2"><label class="wzfld"><span>Wheelbase (mm)</span><input class="wzi" type="number" inputmode="numeric" data-f="van.wheelbase_mm" value="${$esc(v.wheelbase_mm)}"></label>
       <label class="wzfld"><span>Width between wheels (mm)</span><input class="wzi" type="number" inputmode="numeric" data-f="van.track_mm" value="${$esc(v.track_mm)}"></label></div>
     </div><div style="display:grid;gap:10px"><span class="wzk">Picture on the home screen</span>
      <div class="wzpics">
       <button type="button" class="wzpic${photo ? "" : " on"}" data-pic="sample"><div class="im" style="background-image:url('${this._cfg.asset_base ? this._cfg.asset_base + "cc-van.webp" : VCC_VAN}')"></div><b>Sample van</b><small>Use this until you add your own</small></button>
       <button type="button" class="wzpic${photo ? " on" : ""}" data-pic="upload"><div class="im"${photo ? ` style="background-image:url('${$esc(photo)}')"` : ""}>${photo ? "" : "Tap to choose a photo"}</div><b>${photo ? "Your photo · tap to change" : "Your own photo"}</b><small>Side or three-quarter view</small></button>
      </div><input type="file" id="wzFile" accept="image/*" hidden>
      <p class="wzp" style="font-size:13.5px;color:var(--muted)">Tip: a photo with the background removed looks best. Many phones' photo apps can lift the van out of a picture for you, or you can use a free website such as remove.bg. Save it as a PNG so the background stays clear.</p>
     </div></div>`;
  },
  _wz_kit() {
    const d = this._wz.d, e = d.entities;
    const found = {
      power: e.soc || e.batt_voltage ? `Found · ${[e.soc && this._nosVal(e.soc), e.solar && `solar ${this._nosVal(e.solar)}`].filter(Boolean).join(" · ") || "battery"}` : "",
      water: e.fresh || e.waste ? `Found · ${[e.fresh && `fresh ${this._nosVal(e.fresh)}`, e.waste && `waste ${this._nosVal(e.waste)}`].filter(Boolean).join(" · ")}` : "",
      climate: e.cabin_temp || e.outside_temp ? `Found · ${[e.cabin_temp && `inside ${this._nosVal(e.cabin_temp)}`, e.outside_temp && `outside ${this._nosVal(e.outside_temp)}`].filter(Boolean).join(" · ")}` : "",
      heating: e.sw_heater ? `Found · ${this._nosName(e.sw_heater)}` : "",
      fuses: d.fuses && d.fuses.length ? `Can check ${d.fuses.length} fuse${d.fuses.length > 1 ? "s" : ""}` : "",
      level: e.pitch ? "Found · tilt sensor" : "",
      trips: e.fuel ? `Found · fuel ${this._nosVal(e.fuel)}` : "",
    };
    return `<p class="wzk">Step 2</p><h2 class="wzh">What's fitted?</h2>
      <p class="wzp">Tap to switch each one on or off. NomadOS has switched on the ones it found. Anything you leave off is hidden from the dashboard, and you can add it later.</p>
      <div class="wzg">${NOS_FEATURES.map(([k, t, s, pro]) => pro && !this._pro
        ? `<button type="button" class="wzt locked" data-wz="topro"><span class="led"></span><b>${t}</b><small>${s}</small><em class="pro">Pro${found[k] ? ` · ${$esc(found[k].replace(/^Found · /, "found "))}` : ""}</em></button>`
        : `<button type="button" class="wzt${d.features[k] ? " on" : ""}" data-feat="${k}" aria-pressed="${!!d.features[k]}"><span class="led"></span><b>${t}</b><small>${s}</small><em class="${found[k] ? "" : "no"}">${$esc(found[k] || "Not found yet")}</em></button>`).join("")}
       <div class="wzt" style="cursor:default"><span class="led" style="background:var(--olive)"></span><b style="color:var(--ink)">Always on</b><small>Clock, weather, rain radar, place name and the Night switch. These need nothing fitted.</small></div></div>`;
  },
  _nosName(id) { const st = this._hass.states[id]; return String((st && st.attributes.friendly_name) || id); },
  _wzOptions(key, sel) {
    const c = this._nosCands(key);
    if (sel && !c.some((x) => x.id === sel)) c.unshift({ id: sel, name: this._nosName(sel), sc: 0 });
    return `<option value="">Not fitted</option>${c.map((x) => `<option value="${$esc(x.id)}"${x.id === sel ? " selected" : ""} title="${$esc(x.id)}">${$esc(x.name)}${this._nosVal(x.id) ? ` · ${$esc(this._nosVal(x.id))}` : ""}</option>`).join("")}`;
  },
  _wzLiveHtml(key) {
    const id = this._wz.d.entities[key], v = id ? this._nosVal(id) : null;
    return `<span class="wzv${v ? "" : " dim"}" data-live="${key}">${v ? $esc(v) : id ? "No reading" : "—"}${this._wz.auto.has(key) && id ? "<i>Found for you</i>" : ""}</span>`;
  },
  _wzRows(keys) {
    const e = this._wz.d.entities;
    return `<div class="wzl">${keys.map((k) => { const K = NOS_KEYS[k]; return `<div class="wzrow"><div><b>${$esc(K.l)}</b>${K.h ? `<small>${$esc(K.h)}</small>` : ""}</div>
      <select class="wzs${this._wz.auto.has(k) && e[k] ? " found" : ""}" data-ent="${k}" aria-label="${$esc(K.l)}">${this._wzOptions(k, e[k])}</select>${this._wzLiveHtml(k)}</div>`; }).join("")}</div>`;
  },
  _wzStepHead(key, title, text) {
    const n = this._wzSteps().indexOf(key);
    return `<p class="wzk">Step ${n}</p><h2 class="wzh">${title}</h2>${text ? `<p class="wzp">${text}</p>` : ""}`;
  },
  _wz_pro() {
    const n = this._wzSteps().indexOf("pro");
    if (this._pro) return `<p class="wzk">Step ${n}</p><h2 class="wzh">Pro is on</h2>
      <p class="wzp">Thanks for supporting NomadOS. Heating times, fuse alerts, the Level page, fuel and trips, every weather tab, the solar forecast and up to ${NOS_MAX_BUTTONS} buttons are all unlocked. Switch them on in the step before this one.</p>
      <div class="tp"><b style="font-size:15px">Version</b><p class="mnote">NomadOS Pro ${$esc(window.__nomados.pro.version || "")}</p></div>`;
    return `<p class="wzk">Step ${n} · optional</p><h2 class="wzh">NomadOS Pro</h2>
      <p class="wzp">Lite is free, and it's yours to keep. Pro adds the things that make van life easier. You can skip this and add Pro any time from the cog.</p>
      <div class="wz2"><div class="tp"><b style="font-size:16px">Pro adds</b><ul class="wzul"><li>Heating page: weekly times, Boost, Keep warm and a battery guard</li><li>Fuse alerts, from your Victron kit or a fuse sensor box</li><li>Level page with ramp heights, and a compass</li><li>Fuel, trips and engine readings from an OBD reader</li><li>Every weather tab: 12 hours, wind, sun and rain radar</li><li>Solar forecast against what you actually made</li><li>Up to ${NOS_MAX_BUTTONS} buttons along the bottom</li></ul></div>
       <div style="display:grid;gap:12px;align-content:start">
        <label class="wzfld"><span>Licence key</span><input class="wzi" id="wzKey" placeholder="From your NomadOS Pro email" disabled><small>Buying Pro and unlocking it with a key arrives with the shop.</small></label>
        <div class="tp"><b style="font-size:15px">Testing Pro?</b><p class="mnote">If you've been given the NomadOS Pro file, add it here. It's saved in Home Assistant, so you only do this once.</p><div class="wzbtns"><button type="button" class="hb pri" data-wz="profile">Add the Pro file</button></div></div>
        <input type="file" id="wzProFile" accept=".js,text/javascript" hidden></div></div>`;
  },
  async _wzProInstall(file) {
    if (!file) return;
    this._wzMsg("Adding Pro…");
    try {
      const code = await file.text();
      const r = await this._hass.callWS({ type: "nomados/pro/install", code });
      await this._loadPro({ pro: r });
      if (!this._pro) throw new Error("That file isn't NomadOS Pro");
      this._wz.d.features_set = false;
      this._wzAuto(this._wz.d);
      this._wzRender(); this._wzMsg("Pro is on");
    } catch (e) { this._wzMsg(`Couldn't add Pro: ${(e && e.message) || e}`, true); }
  },
  _wz_power() {
    const d = this._wz.d;
    return `${this._wzStepHead("power", "Battery & solar", "These are the readings NomadOS found. Green outlines are its guesses: check the live reading on the right looks right. Pick <b>Not fitted</b> for anything you don't have.")}
     <div class="wz3"><label class="wzfld"><span>Battery size (Ah)</span><input class="wzi" type="number" data-f="battery_ah" value="${$esc(d.battery_ah)}"></label>
      <label class="wzfld"><span>Battery voltage</span><select class="wzs" data-f="battery_v">${[[12.8, "12 V"], [25.6, "24 V"], [51.2, "48 V"]].map(([v, l]) => `<option value="${v}"${Number(d.battery_v) === v ? " selected" : ""}>${l}</option>`).join("")}</select></label>
      <label class="wzfld"><span>Solar panels (watts)</span><input class="wzi" type="number" data-f="solar_wp" value="${$esc(d.solar_wp)}"></label></div>
     ${this._wzRows(NOS_STEPS.power.keys)}`;
  },
  _wz_water() {
    const d = this._wz.d;
    return `${this._wzStepHead("water", "Water", "Tank levels in %. NomadOS uses the fresh tank size to say how many litres are left.")}
     <div class="wz3"><label class="wzfld"><span>Fresh tank size (litres)</span><input class="wzi" type="number" data-f="fresh_litres" value="${$esc(d.fresh_litres)}"></label></div>
     ${this._wzRows(NOS_STEPS.water.keys)}`;
  },
  _wz_climate() { return `${this._wzStepHead("climate", "Climate", "Temperature and humidity sensors. Zigbee sensors such as Sonoff or Aqara work well. The inside sensor also lets the heating hold a temperature.")}${this._wzRows(NOS_STEPS.climate.keys)}`; },
  _wz_heating() {
    const e = this._wz.d.entities;
    return `${this._wzStepHead("heating", "Heating", "Pick the smart relay wired to your heater's remote-start. NomadOS then adds a Heating page: weekly heating times, Boost, Keep warm, and a battery guard that won't start the heater on a low battery.")}
     ${this._wzRows(["sw_heater"])}
     <div class="wzwarn">If something else already switches this heater (an automation, a thermostat or a schedule you made yourself), turn that off first, or the two will fight.</div>
     <div class="tp"><b style="font-size:15px">How it holds the temperature</b><p class="mnote">${e.cabin_temp ? `It uses <b>${$esc(this._nosName(e.cabin_temp))}</b> (${$esc(this._nosVal(e.cabin_temp) || "no reading")}) from the Climate step. Once the heater starts, it runs for at least 20 minutes, because diesel heaters soot up on short runs.` : "No inside temperature sensor was picked, so it runs the heater by the clock: on during your heating times, off outside them. The heater's own controls set how hot it gets. Add an inside sensor later to hold a temperature."}</p></div>
     <p class="wzp" style="font-size:13.5px;color:var(--muted)">Your heater's own panel keeps working as normal. NomadOS only decides when it runs.</p>`;
  },
  _wz_switches() {
    const d = this._wz.d, s = d.switches, f = d.features;
    const iconOpts = (sel) => Object.entries(SW_ICON_NAMES).map(([k, n]) => `<option value="${k}"${k === sel ? " selected" : ""}>${n}</option>`).join("");
    const rows = s.map((x, i) => {
      const ctl = `<div class="wzbtns"><button type="button" class="wzx" data-wz="swup" data-i="${i}"${i === 0 ? " disabled" : ""} aria-label="Move left">◂</button><button type="button" class="wzx" data-wz="swdel" data-i="${i}">Remove</button></div>`;
      if (x.special) {
        const info = { heater: "Turns heating on and off. Uses your heating times", inverter: "Turns the inverter on and off", night: "Dims the screen at night" }[x.special];
        return `<div class="wzsw"><span class="si">${SW_ICONS[x.special]}</span><div class="fixed">${$esc(x.name)}<small>${info}</small></div><span></span><span></span>${ctl}</div>`;
      }
      const opts = `<option value="">Pick a switch or light</option>${["switch", "light", "fan", "input_boolean"].flatMap((dom) => Object.keys(this._hass.states).filter((id) => id.startsWith(dom + ".") && !/nomados/.test(id)).sort()).map((id) => `<option value="${$esc(id)}"${id === x.entity ? " selected" : ""}>${$esc(this._nosName(id))}</option>`).join("")}`;
      return `<div class="wzsw"><span class="si">${SW_ICONS[x.icon] || SW_ICONS.power}</span><select class="wzs" data-sw="${i}" data-k="entity" aria-label="Switch">${opts}</select>
        <input class="wzi" data-sw="${i}" data-k="name" maxlength="14" value="${$esc(x.name)}" placeholder="Button name" aria-label="Button name"><select class="wzs" data-sw="${i}" data-k="icon" aria-label="Picture">${iconOpts(x.icon)}</select>${ctl}</div>`;
    }).join("");
    const has = (k) => s.some((x) => x.special === k), full = s.length >= this._wzMax();
    const adds = [!full && `<button type="button" class="hb" data-wz="swadd">Add a switch or light</button>`,
      !full && f.heating && !has("heater") && `<button type="button" class="hb" data-wz="swspecial" data-s="heater">Add Heater button</button>`,
      !full && d.entities.inverter_mode && !has("inverter") && `<button type="button" class="hb" data-wz="swspecial" data-s="inverter">Add Inverter button</button>`,
      !full && !has("night") && `<button type="button" class="hb" data-wz="swspecial" data-s="night">Add Night button</button>`].filter(Boolean).join("");
    return `${this._wzStepHead("switches", "Buttons", `The row of buttons along the bottom of the screen, left to right. Up to ${this._wzMax()}${this._pro ? "" : " with Lite, 7 with Pro"}. Add the smart relays for your lights, pump and so on.`)}
     <div class="wzl">${rows || '<p class="mnote" style="padding:12px 0">No buttons yet.</p>'}</div>
     <div class="wzbtns">${adds}${full ? '<span class="wzc">The row is full</span>' : ""}</div>`;
  },
  _wz_fuses() {
    const d = this._wz.d, S = this._hass.states;
    const vOpts = (sel) => `<option value="">Pick its voltage reading</option>${Object.keys(S).filter((id) => id.startsWith("sensor.") && (S[id].attributes || {}).unit_of_measurement === "V").sort().map((id) => `<option value="${$esc(id)}"${id === sel ? " selected" : ""}>${$esc(this._nosName(id))} · ${$esc(this._nosVal(id))}</option>`).join("")}`;
    const bOpts = (sel) => `<option value="">Pick its sense input</option>${Object.keys(S).filter((id) => id.startsWith("binary_sensor.") && !/nomados/.test(id)).sort().map((id) => `<option value="${$esc(id)}"${id === sel ? " selected" : ""}>${$esc(this._nosName(id))}</option>`).join("")}`;
    const row = (x, i) => `<div class="wzfz"><input class="wzi" data-fz="${i}" data-k="label" value="${$esc(x.label)}" placeholder="${x.check === "victron" ? "For example Inverter" : "For example Lights"}" aria-label="Fuse name">
      <select class="wzs" data-fz="${i}" data-k="entity" aria-label="Reading">${x.check === "victron" ? vOpts(x.entity) : bOpts(x.entity)}</select>
      <input class="wzi" data-fz="${i}" data-k="rating" value="${$esc(x.rating)}" placeholder="Size, e.g. 15 A" aria-label="Fuse size"><button type="button" class="wzx" data-wz="fzdel" data-i="${i}">Remove</button></div>`;
    const vic = d.fuses.map((x, i) => (x.check === "victron" ? row(x, i) : "")).join(""), sen = d.fuses.map((x, i) => (x.check === "sense" ? row(x, i) : "")).join("");
    return `${this._wzStepHead("fuses", "Fuses", "NomadOS can spot a blown fuse two ways. You get an alert on the screen and in Home Assistant.")}
     ${d.entities.batt_voltage ? "" : '<div class="wzwarn">Pick a battery voltage on the Battery &amp; solar step first. Fuse checks compare against it.</div>'}
     <div class="wz2"><div style="display:grid;gap:10px"><span class="wzk">Victron check · free</span><p class="mnote">Your inverter, solar charger and alternator charger each measure the battery themselves. If one stops reporting, or sees a very different voltage from the battery monitor for 3 minutes, its fuse has gone.</p></div>
      <div style="display:grid;gap:10px"><span class="wzk">Sense wire · needs a fuse sensor box</span><p class="mnote">A thin wire from the output side of each fuse goes to a small box (an ESP32 and an optocoupler board, about £30). No power on the wire means the fuse has blown.</p></div></div>
     <div class="wzl">${vic || '<p class="mnote" style="padding:12px 0">No Victron checks yet.</p>'}</div><div class="wzbtns"><button type="button" class="hb" data-wz="fzadd" data-c="victron">Add a Victron check</button></div>
     <div class="wzl">${sen || '<p class="mnote" style="padding:12px 0">No sense wires yet. Add them once your fuse sensor box is fitted.</p>'}</div><div class="wzbtns"><button type="button" class="hb" data-wz="fzadd" data-c="sense">Add a sense-wire fuse</button></div>`;
  },
  _wz_level() { return `${this._wzStepHead("level", "Level & compass", "Angles in degrees from a tilt sensor (an ESP32 with an MPU6050 is about £10). Nose up and leaning left are positive. You can set your own level spot later on the Level page.")}${this._wzRows(NOS_STEPS.level.keys)}`; },
  _wz_trips() {
    const d = this._wz.d;
    return `${this._wzStepHead("trips", "Fuel & trips", "Readings from an OBD reader plugged into the van. They only update while the engine is running.")}
     <div class="wz3"><label class="wzfld"><span>Fuel price (£ a litre)</span><input class="wzi" type="number" step="0.01" data-f="fuel_price" value="${$esc(d.fuel_price == null ? 1.45 : d.fuel_price)}"></label></div>${this._wzRows(NOS_STEPS.trips.keys)}`;
  },
  _wz_extras() { return `${this._wzStepHead("extras", "Extras", "Optional. Skip any you don't have: the weather and place name still work from your Home location.")}${this._wzRows(NOS_STEPS.extras.keys)}`; },
  _wz_finish() {
    const d = this._wz.d, e = d.entities, f = d.features;
    const cnt = (keys) => keys.filter((k) => e[k]).length;
    const card = (on, t, p) => `<div class="tp"><b>${t}</b><p>${on ? p : "Off. Turn it on any time from the cog."}</p></div>`;
    const btns = d.switches.map((s) => s.name || "Switch").join(", ");
    return `<p class="wzk">Last step</p><h2 class="wzh">Ready to go</h2>
     <p class="wzp">Press Finish and NomadOS saves this and makes what it needs. That includes ${f.heating ? "the heating controls, " : ""}${f.fuses ? "the fuse alerts, " : ""}the Night switch and the plate. Then your dashboard opens.</p>
     <div class="wzsum">
      <div class="tp"><b>${$esc((d.van.plate || "VAN").toUpperCase())} · ${$esc(d.van.short || "")}</b><p>${d.photo ? "Your own photo" : "The sample van picture"}. ${Math.round((d.battery_ah || 0) * (d.battery_v || 12.8) / 100) / 10} kWh battery, ${$esc(d.solar_wp || 0)} W of solar.</p></div>
      ${card(f.power, "Battery & solar", `${cnt(NOS_STEPS.power.keys)} of ${NOS_STEPS.power.keys.length} readings connected.`)}
      ${card(f.water, "Water", `${cnt(NOS_STEPS.water.keys)} tank${cnt(NOS_STEPS.water.keys) === 1 ? "" : "s"}, ${$esc(d.fresh_litres)} litre fresh tank.`)}
      ${card(f.climate, "Climate", `${cnt(NOS_STEPS.climate.keys)} sensor${cnt(NOS_STEPS.climate.keys) === 1 ? "" : "s"} connected.`)}
      ${card(f.heating, "Heating", e.sw_heater ? `Runs ${$esc(this._nosName(e.sw_heater))}${e.cabin_temp ? " and holds the temperature" : " by the clock"}.` : '<span style="color:var(--heat)">No heater switch picked, so heating stays off.</span>')}
      <div class="tp"><b>Buttons</b><p>${$esc(btns) || "None"}.</p></div>
      ${card(f.fuses, "Fuses", `${d.fuses.filter((x) => x.entity && x.label).length} fuses watched.`)}
      ${card(f.level || f.trips, "Level, fuel & trips", [f.level && "Level page on", f.trips && "Fuel & trips page on"].filter(Boolean).join(", ") + ".")}
     </div>`;
  },

  /* ---------- photo and saving ---------- */
  async _wzPhoto(file) {
    if (!file) return;
    this._wzMsg("Adding your photo…");
    try {
      const url = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("That file isn't a picture this browser can open")); i.src = url; });
      const k = Math.min(1, 1600 / img.width, 1100 / img.height), c = document.createElement("canvas");
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      let data = c.toDataURL("image/webp", 0.86), ext = "webp";
      if (!data.startsWith("data:image/webp")) { data = c.toDataURL("image/png"); ext = "png"; }
      const r = await this._hass.callWS({ type: "nomados/photo", data, ext });
      this._wz.d.photo = `${r.url}?t=${Date.now()}`;
      this._wzRender(); this._wzMsg("Photo added");
    } catch (e) { this._wzMsg(`Couldn't add that photo: ${(e && e.message) || e}`, true); }
  },
  async _wzSave() {
    const w = this._wz, d = nosClone(w.d);
    // Only keep the sensors for the parts that are switched on
    Object.values(NOS_STEPS).forEach((s) => { if (s.f && !d.features[s.f]) (s.keys || []).forEach((k) => { if (k !== "cabin_temp" || !d.features.heating) d.entities[k] = ""; }); });
    if (!d.features.heating) d.switches = d.switches.filter((s) => s.special !== "heater");
    d.switches = d.switches.filter((s) => s.special || s.entity);
    const ids = new Set();
    d.fuses = (d.fuses || []).filter((x) => x.entity && String(x.label || "").trim()).map((x) => {
      let id = nosSlug(x.label); while (ids.has(id)) id += "_2"; ids.add(id);
      return { ...x, id, label: String(x.label).trim(), group: x.check === "victron" ? "Main fuses" : "Fuse box", style: x.check === "victron" ? "mega" : "blade", skip_when_off: x.check === "victron" && /invert|multi/i.test(x.label) ? d.entities.inverter_mode || "" : x.skip_when_off || "" };
    });
    d.battery_wh = Math.round((Number(d.battery_ah) || 0) * (Number(d.battery_v) || 12.8)) || null;
    d.van.plate = String(d.van.plate || "").trim().slice(0, 14);
    d.features_set = true;
    d.setup_done = true;
    this._wzMsg("Saving and setting up…");
    this.shadowRoot.querySelectorAll(".wzf .hb").forEach((b) => { b.disabled = true; });
    try {
      await this._hass.callWS({ type: "nomados/config/save", config: d });
      // NomadOS restarts itself to add or remove its helpers; wait for them to appear
      let r = null;
      for (let i = 0; i < 20; i++) {
        await new Promise((ok) => setTimeout(ok, 500));
        try { r = await this._hass.callWS({ type: "nomados/config" }); } catch (e) { r = null; continue; }
        const own = r.own || {};
        if (r.config && r.config.setup_done && own.night_mode && (!d.features.heating || own.heating_mode) && this._hass.states[own.night_mode]) break;
      }
      if (!r) throw new Error("NomadOS didn't come back after saving. Reload the page.");
      this._wz = null;
      this._applyNomad(r);
      this._ready = false;
      this._init();
    } catch (e) {
      this._wzMsg(`Couldn't save: ${(e && e.message) || "needs an administrator login"}`, true);
      this.shadowRoot.querySelectorAll(".wzf .hb").forEach((b) => { b.disabled = false; });
    }
  },
  _wzLive() {
    if (!this._wz || !this.$ || !this.$("wz") || this.$("wz").hidden) return;
    this.shadowRoot.querySelectorAll("[data-live]").forEach((el) => {
      const k = el.dataset.live, id = this._wz.d.entities[k], v = id ? this._nosVal(id) : null;
      const txt = v || (id ? "No reading" : "—");
      if (el.firstChild && el.firstChild.nodeType === 3) { if (el.firstChild.textContent !== txt) el.firstChild.textContent = txt; }
    });
  },
};
Object.assign(VanCommandCentre.prototype, NOS_METHODS);

// Pro pages are a separate download. Until it's added, these do nothing.
Object.assign(VanCommandCentre.prototype, {
  _rawLevel() { return null; },
  _level() { return undefined; },
  _renderMiniLevel() { return undefined; },
  _renderLevel() { return undefined; },
  _demoRamps() { return undefined; },
  _loadRadar() { return undefined; },
  _loadHistory() { return undefined; },
  _solarChart() { return undefined; },
  _boostLeft() { return null; },
  _schedNow() { return undefined; },
  _heatInfo() { return {}; },
  _setHeatMode() { return undefined; },
  _stepNum() { return undefined; },
  _setKeep() { return undefined; },
  _toggleBoost() { return undefined; },
  _dayWord() { return undefined; },
  _nextChange() { return undefined; },
  _wkMsg() { return undefined; },
  _dirty() { return undefined; },
  _findSchedule() { return undefined; },
  _loadSchedule() { return undefined; },
  _saveSchedule() { return undefined; },
  _copyDay() { return undefined; },
  _buildWeek() { return undefined; },
  _drawWeek() { return undefined; },
  _renderHeating() { return undefined; },
  _fuses() { return []; },
  _fuseTile() { return undefined; },
  _renderFuses() { return undefined; },
  _demoBlow() { return undefined; },
  _trips() { return []; },
  _renderTrips() { return undefined; },
});
window.__nomados = Object.assign(window.__nomados || {}, { VanCommandCentre, $esc, BLADE_COL, COMPASS8, DIRS, EXTRA_CSS, ICON, NOS_FEATURES, NOS_FUSE_GUESS, NOS_KEYS, NOS_MAX_BUTTONS, NOS_METHODS, NOS_OWN, NOS_STEPS, NOS_VANS, P, REAR_VAN, SIDE_VAN, SWITCHES, SW_ICONS, SW_ICON_NAMES, T, TICKS, TOP_VAN, VCC_CSS, VCC_DAY3, VCC_DAYS, VCC_DEFAULT_ENTITIES, VCC_DEFAULT_PAGES, VCC_DISCOVER, VCC_FALLBACK, VCC_TOPO, VCC_VAN, VCC_VERSION, VCC_WHEELBASE_MM, WZ_CSS, blocksToSlots, clamp, compass, demoForecast, demoFuses, demoSchedule, demoSeries, demoStates, demoWeather, fmt, fuseSvg, hm, markup, nosClone, nosSlug, num, osGridRef, pad2, row, scale, slotOf, slotsToBlocks, timeOf, wmo });
if (!customElements.get("nomados-panel")) customElements.define("nomados-panel", class extends VanCommandCentre {});
console.info(`%c NOMADOS %c ${VCC_VERSION} `, "background:#7D8457;color:#111;font-weight:700", "background:#222;color:#ECE6DC");
