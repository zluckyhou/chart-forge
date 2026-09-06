#!/usr/bin/env python3
"""Build the interactive Studio / Classic design comparison, with explicit sample data."""
import json, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
sys.path.insert(0,str(ROOT/'scripts'))
from render import read, FONT_LINK

def build(out):
    def sample(name): return json.loads((ROOT/'assets/examples'/f'{name}.json').read_text())
    line=sample('studio-revenue'); line['width']=1232; line['layout']='feature'; line['options']['difference']=True; line['options']['height']=265; line['data']['series'][1]['color']='var(--ck-ink2)'; line['note']='两线之间的色带表示收入差距；末端括号标出最新差额。悬停或使用方向键可逐月查数。'
    ranking=sample('bar-ranking'); ranking.update(width=464,title='Analytics 跃升至第二',subtitle='产品 ARR · 2026 Q2 · 千美元 · 示例数据',note='悬停查看占比与均值差距；表格可查精确数值。');ranking['options']['labelWidth']=78;ranking['options']['rankNumbers']=True
    heat=sample('heatmap-hours');heat.update(width=744,title='工作日看上午，周末看晚间',subtitle='每小时平均会话量 · 最近四周 · 示例数据')
    bar={'type':'bar','width':464,'title':'上半年，订阅收入稳步增加','subtitle':'2026.01—06 · 千美元 · 示例数据','data':{'categories':['1月','2月','3月','4月','5月','6月'],'series':[{'name':'订阅收入','values':[336,352,371,388,402,412]}]},'options':{'format':'currency','currency':'$','height':238}}
    table=sample('table-experiment');table.update(width=1232,title='简化表单，同时改善了转化和客单贡献',subtitle='结账实验 · 14 天 · 5 个版本 · 示例数据')
    kpi=sample('kpi-tiles');kpi['width']=1232
    for x,lab in zip(kpi['data']['items'],['新增用户','活跃用户','结账转化率','每次注册成本']):x['label']=lab;x['vs']='上一期'
    specs=[line,kpi,ranking,heat,bar,table]; bar['width']=744
    css=read(str(ROOT/'assets/chartkit.css'));js=read(str(ROOT/'assets/chartkit.js'))
    html='''<!doctype html><html lang="zh-CN" data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Chart Forge · Studio 设计对照</title>'''+FONT_LINK+'<style>'+css+'''
body { margin:0; background:var(--ck-plane); color:var(--ck-ink); font-family:var(--ck-font); }
.shell { max-width:1232px; margin:auto; padding:32px 32px 48px; }
.mast { display:flex; align-items:center; justify-content:space-between; padding-bottom:24px; border-bottom:1px solid var(--ck-grid); gap:16px; flex-wrap:wrap; }
.brand { display:flex; align-items:center; gap:12px; font-size:14px; font-weight:600; letter-spacing:.02em; }
.logo { display:flex; gap:3px; align-items:flex-end; width:24px; height:23px; }.logo i{background:var(--ck-s1);width:5px;border-radius:1px}.logo i:nth-child(1){height:10px}.logo i:nth-child(2){height:17px}.logo i:nth-child(3){height:23px}
.brand span { color:var(--ck-muted); font-size:11px; font-weight:400; letter-spacing:.06em; }
.actions { display:flex; gap:8px; }.actions button { font:500 12px var(--ck-font); border:1px solid var(--ck-axis); color:var(--ck-ink2); background:transparent; padding:8px 14px; border-radius:5px; cursor:pointer; }.actions button[aria-pressed=true]{background:var(--ck-ink);color:var(--ck-plane);border-color:var(--ck-ink)}
.intro { display:flex; justify-content:space-between; align-items:flex-end; margin:30px 0; gap:20px; }.intro h1{font-size:32px; font-weight:500; letter-spacing:-.04em; margin:0 0 9px}.intro p{font-size:12px;line-height:1.8;color:var(--ck-muted);margin:0}.edition{font:11px ui-monospace,monospace;color:var(--ck-muted);white-space:nowrap}
#showcase{display:grid;grid-template-columns:minmax(0,464px) minmax(0,744px);gap:24px;align-items:start}.full{grid-column:1/-1;min-width:0} .slot{min-width:0}.slot:nth-child(3){grid-column:1;grid-row:3/5}.slot:nth-child(4),.slot:nth-child(5){grid-column:2} .slot > *{max-width:100%}
footer{font-size:11px;color:var(--ck-muted);border-top:1px solid var(--ck-grid);padding-top:20px;margin-top:28px;display:flex;justify-content:space-between;gap:16px;line-height:1.7}
button:focus-visible{outline:2px solid var(--ck-s1);outline-offset:3px}
@media(max-width:1000px){#showcase{grid-template-columns:minmax(0,1fr)}.full{grid-column:auto}.slot:nth-child(n){grid-column:1;grid-row:auto}.slot > *{width:100%!important}.intro{align-items:start}.edition{display:none}}
@media(max-width:600px){.shell{padding:20px 16px}.intro h1{font-size:26px}.intro{margin:24px 0}.actions{flex-wrap:wrap}footer{flex-direction:column}}
</style></head><body><main class="shell"><header class="mast"><div class="brand"><b class="logo"><i></i><i></i><i></i></b>CHART FORGE <span> / STUDIO / SIGNAL</span></div><nav class="actions" aria-label="设计对照"><button id="studio" aria-pressed="true">新版 Signal</button><button id="classic" aria-pressed="false">改版前</button><button id="theme">切换浅色</button></nav></header><section class="intro"><div><p>设计研究 02 / 让差距成为图形，让数字成为版面。</p></div><span class="edition">SAME DATA. A DIFFERENT PERSPECTIVE.</span></section><div id="showcase"></div><footer><span>示例数据仅用于检验图表设计，不代表真实业务表现。</span><span id="mode-note">Signal · 差距色带 / 数字侧栏 / 排名刻度</span></footer></main><script>'''+js+'</script><script>const specs='+json.dumps(specs,ensure_ascii=False).replace('</','<\\/')+''';
function draw(style){const host=document.getElementById('showcase');host.replaceChildren();specs.forEach((raw,i)=>{const s=JSON.parse(JSON.stringify(raw));s.style=style;s.lang='zh';if(style==='classic'){delete s.spotlight;if(s.options)delete s.options.difference;delete s.note;}const slot=document.createElement('section');slot.className='slot'+([0,1,5].includes(i)?' full':'');host.append(slot);ChartKit.render(slot,s)});['studio','classic'].forEach(x=>document.getElementById(x).setAttribute('aria-pressed',String(x===style)));document.getElementById('mode-note').textContent=style==='studio'?'Signal · 差距色带 / 数字侧栏 / 排名刻度':'Classic · 本次修改前的卡片与图形样式';}
document.getElementById('studio').onclick=()=>draw('studio');document.getElementById('classic').onclick=()=>draw('classic');document.getElementById('theme').onclick=()=>{const dark=document.documentElement.dataset.theme==='dark';document.documentElement.dataset.theme=dark?'light':'dark';document.getElementById('theme').textContent=dark?'切换深色':'切换浅色'};draw('studio');</script></body></html>'''
    Path(out).write_text(html);print(out)
if __name__=='__main__':build(sys.argv[1] if len(sys.argv)>1 else 'design-preview.html')
