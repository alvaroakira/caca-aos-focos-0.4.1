

const scriptsInEvents = {

	async Es_ui_Event1_Act1(runtime, localVars)
	{
		// Estados visuais 9-patch. As acoes do jogo continuam em UI_Dispatch.
		const storeKey = Symbol.for('caf.buttons.v1');
		let controllers = globalThis[storeKey];
		if (!controllers) globalThis[storeKey] = controllers = new WeakMap();
		let ui = controllers.get(runtime);
		if (!ui) {
		  const all = name => runtime.objects[name]?.getAllInstances() || [];
		  const g = () => runtime.globalVars;
		  const canInput = () => g().g_ready === 1 && g().g_mode !== 'action' && runtime.gameTime >= g().g_ignore_until;
		  const layerVisible = layer => {
		    for (let l = layer; l; l = l.parentLayer) if (l.isVisible === false) return false;
		    return true;
		  };
		  ui = {
		    entries: [], held: null, pending: null, hover: null, mouse: null, captureId: null,
		    reset() {
		      this.cancel(); this.mouse = null; this.hover = null; this.captureId=null;
		      const skins = ['UIButtonFocus','UIButtonPressed','UIButtonDisabled'].map(n => new Map(all(n).map(x => [x.instVars.UIKey,x])));
		      const labels = new Map();
		      for (const name of ['Label','Choice1','Choice2']) for (const label of all(name)) {
		        const key = label.instVars.UIKey;
		        if (key) { if (!labels.has(key)) labels.set(key,[]); labels.get(key).push({inst:label,y:label.y}); }
		      }
		      this.entries = all('UIButton').map(b => ({ b, key:b.instVars.UIKey, skins:skins.map(m=>m.get(b.instVars.UIKey)), labels:labels.get(b.instVars.UIKey)||[] }));
		      this.render();
		    },
		    visible(e) { return e.b.isVisible && layerVisible(e.b.layer); },
		    active(e) { return this.visible(e) && e.b.instVars.Enabled === 1 && e.b.instVars.Scope === g().g_scope; },
		    inside(e, x, y) {
		      const [lx,ly] = e.b.layer.cssPxToLayer(x,y);
		      return e.b.containsPoint(lx,ly);
		    },
		    hit(x,y) {
		      const matches = this.entries.filter(e => this.active(e) && this.inside(e,x,y));
		      return matches.sort((a,b) => b.b.layer.index-a.b.layer.index || b.b.zIndex-a.b.zIndex)[0] || null;
		    },
		    focused() { return this.entries.find(e => this.active(e) && e.b.instVars.Order === g().g_focus) || null; },
		    valid(h) {
		      if (!h || h.layout !== runtime.layout || h.scope !== g().g_scope || h.mode !== g().g_mode || !canInput()) return false;
		      if (h.entry) return this.active(h.entry);
		      return g().g_scene===1 && g().g_scope==='base' && h.caseInst?.isVisible && layerVisible(h.caseInst.layer);
		    },
		    start(data) {
		      if (this.held || this.pending || !canInput()) return;
		      this.held = {...data,layout:runtime.layout,scope:g().g_scope,mode:g().g_mode,started:runtime.wallTime};
		      this.render();
		    },
		    release(h) {
		      this.held = null;
		      if (this.valid(h)) this.pending = {...h, due:Math.max(runtime.wallTime,h.started+0.07)};
		      this.render();
		    },
		    cancel() {
		      this.held = null; this.pending = null;
		      for (const e of this.entries) for (const l of e.labels) l.inst.y=l.y;
		    },
		    dispatch(h) {
		      if (!this.valid(h)) return;
		      const v=g(); v.g_ignore_until=runtime.gameTime+0.18;
		      v.g_key_scope=h.scope; v.g_key_focus=v.g_focus;
		      runtime.callFunction('Audio_Start');
		      if (h.entry) {
		        v.g_action=h.entry.b.instVars.Action;
		        runtime.callFunction('SFX_toque'); runtime.callFunction('UI_Dispatch');
		      } else { v.g_case=h.caseInst.instVars.CaseID; runtime.callFunction('Case_Open'); }
		    },
		    render() {
		      const h=this.held || this.pending;
		      for (const e of this.entries) {
		        const active=this.active(e), visible=this.visible(e);
		        const pressed=active && h?.entry===e;
		        const focus=active && !pressed && (this.hover===e || e.b.instVars.Order===g().g_focus);
		        const state=e.b.instVars.Enabled!==1 ? 3 : pressed ? 2 : focus ? 1 : 0;
		        e.b.opacity=state===0 ? 1 : 0;
		        e.skins.forEach((skin,i) => {
		          if (!skin) return;
		          skin.x=e.b.x;skin.y=e.b.y;skin.width=e.b.width;skin.height=e.b.height;
		          skin.isVisible=visible && state===i+1;skin.opacity=1;
		        });
		        for (const l of e.labels) l.inst.y=l.y+(pressed?1:0);
		      }
		    },
		    tick() {
		      if (this.captureId!==null) g().g_ui_block_until=runtime.gameTime+0.25;
		      if (this.held && !this.valid(this.held)) this.cancel();
		      if (this.pending && !this.valid(this.pending)) this.cancel();
		      this.hover=this.mouse ? this.hit(this.mouse.x,this.mouse.y) : null;
		      if (this.pending && runtime.wallTime>=this.pending.due) {
		        const h=this.pending;this.pending=null;this.render();this.dispatch(h);
		      }
		      this.render();
		    }
		  };
		  controllers.set(runtime,ui);
		  runtime.addEventListener('pointerdown',ev => {
		    if (ev.button!==0 || ev.isPrimary===false) return;
		    const entry=ui.hit(ev.clientX,ev.clientY);
		    if (!entry) return;
		    // Impede um toque no botao de atingir objetos do cenario atras dele.
		    g().g_ui_block_until=runtime.gameTime+0.25;
		    ui.captureId=ev.pointerId;
		    ui.start({entry,pointerId:ev.pointerId});
		  });
		  runtime.addEventListener('pointermove',ev => {
		    if (ev.pointerType==='mouse') ui.mouse={x:ev.clientX,y:ev.clientY};
		    const h=ui.held;
		    if (h?.pointerId===ev.pointerId && !ui.inside(h.entry,ev.clientX,ev.clientY)) {
		      g().g_ui_block_until=runtime.gameTime+0.25;ui.cancel();
		    }
		    ui.render();
		  });
		  runtime.addEventListener('pointerup',ev => {
		    if(ui.captureId===ev.pointerId) {g().g_ui_block_until=runtime.gameTime+0.25;ui.captureId=null;}
		    const h=ui.held;
		    if (h?.pointerId!==ev.pointerId) return;
		    g().g_ui_block_until=runtime.gameTime+0.25;
		    if (!ui.inside(h.entry,ev.clientX,ev.clientY)) ui.cancel();else ui.release(h);
		    if (ev.pointerType!=='mouse') ui.hover=null;
		  });
		  runtime.addEventListener('pointercancel',ev => { if(ui.captureId===ev.pointerId) ui.captureId=null; if(ui.held?.pointerId===ev.pointerId) ui.cancel(); });
		  runtime.addEventListener('keydown',ev => {
		    if (!['Enter','NumpadEnter','Space'].includes(ev.code)) {
		      if (['Escape','Tab','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(ev.code)) ui.cancel();
		      return;
		    }
		    if (ev.repeat || !canInput()) return;
		    const entry=ui.focused();
		    if (entry) ui.start({entry,code:ev.code,focus:g().g_focus});
		    else if (g().g_scene===1 && g().g_scope==='base') {
		      const caseInst=all('CaseSprite').find(x=>x.instVars.Index===g().g_focus);
		      if (caseInst) ui.start({caseInst,code:ev.code,focus:g().g_focus});
		    }
		  });
		  runtime.addEventListener('keyup',ev => {
		    const h=ui.held;if (h?.code!==ev.code) return;
		    if (h.focus!==g().g_focus) ui.cancel(); else ui.release(h);
		  });
		  runtime.addEventListener('suspend',()=>{ui.cancel();ui.captureId=null;ui.mouse=null;ui.hover=null;ui.render();});
		  runtime.addEventListener('beforeanylayoutend',()=>{ui.cancel();ui.captureId=null;ui.entries=[];ui.hover=null;ui.mouse=null;});
		  runtime.addEventListener('tick2',()=>ui.tick());
		  // DOM blur cobre a perda de foco mesmo quando o projeto continua rodando.
		  if (typeof window!=='undefined') window.addEventListener('blur',()=>{ui.cancel();ui.captureId=null;ui.mouse=null;ui.hover=null;ui.render();});
		}
		ui.reset();
	}
};

globalThis.C3.JavaScriptInEvents = scriptsInEvents;
