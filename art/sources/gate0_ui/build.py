"""Generate original vector exports for Wake. Run from any cwd (Python 3)."""
from pathlib import Path
import json
root=Path(__file__).resolve().parents[3]; ui=root/'art/ui';ui.mkdir(parents=True,exist_ok=True)
# Rounded, broad-shouldered maritime lettering, designed on a 208 x 72 unit grid.
# Stroke paths form the editable lettering skeleton; the tapered foam channel is
# cut through the lower third, rather than printed over it.
skeleton='<path d="M12 16 20 54 Q20.7 57 23 54 L34 30 Q35 28 36 30 L46 54 Q47.6 57 48.5 53.5 L57 16 M68 55 82 16 Q82.8 14.2 84 16 L99 55 M73 43 H93 M115 16 V55 M143 16 118 36 144 55 M192 16 H161 V55 H192 M161 35 H185"/>'
wave='M0 48 C18 51 33 52 52 48 S83 40 105 44 S131 51 154 47 S178 40 208 43 Q184 41.7 157 49.4 T106 46.8 T53 50.5 T0 49.5 Z'
logo=f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 206 72" role="img" aria-label="Wake">
<title>WAKE</title>
<defs><g id="letterforms" fill="none" stroke="currentColor" stroke-width="13.5" stroke-linecap="round" stroke-linejoin="round">{skeleton}</g>
<mask id="foam"><path fill="white" d="M0 0H206V72H0z"/><path d="{wave}"/></mask>
<filter id="halo" x="-10%" y="-22%" width="120%" height="144%"><feGaussianBlur stdDeviation="3.1"/></filter></defs>
<g mask="url(#foam)"><g color="#a8edf5" opacity=".60" filter="url(#halo)"><use href="#letterforms"/></g><g color="#f7fcff"><use href="#letterforms"/></g></g></svg>"""
(ui/'logo.svg').write_text(logo+'\n')
icons={
'searchlight':('Searchlight','<g transform="rotate(-24 7.8 8.8)"><rect x="3" y="6" width="8" height="5.5" rx="1.2"/></g><path d="m13.4 5.9 6.9-3.3m-6 5.6 7.1-.1M6.7 13l-2.5 7.8m4.6-8.7 2.8 8.7M3 21h10M5.5 17.5h4.7"/>'),
'barge':('Barge','<path d="M2.2 13.2h19.6l-3.1 5.4H6.3zM5.2 13.2V8.4h6.2v4.8m0-4.8h6.7v4.8M7 8.4V4.6h7v3.8"/>'),
'mine':('Mine','<circle cx="12" cy="11.4" r="5.8"/><path d="M11.9 2.8v2.7m-8.2.1 3.3 2m-4.1 5.2 3.3-.5m12.1-5.1 2.5-1.6m-2.7 7.6 2.9 1.1M7.7 15.5l-2 2.3m10.5-2.2 2.1 2M12 17.3v2.3c0 2 2.9 2.3 3.9 1.1"/><path d="m9.5 8.9.6-.5"/>'),
'whirlpool':('Whirlpool','<path d="M3 8.6C5 4.7 11.3 3.4 16.4 4.9c4.3 1.3 5.7 4.9 3.1 7.8-2.6 2.8-8.8 3.8-12.4 1.8-3.5-1.9-2.2-5.1 1.5-6.2 3.3-1 7.1-.3 7.6 1.7.4 1.7-1.9 3-4.3 2.5M6 17c2.9 1.9 6.6 2.4 10.3 1.2m-7.4 2.6 2.5.7"/>')
}
for name,(label,markup) in icons.items():
 (ui/f'icon_{name}.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" role="img" aria-label="{label}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><title>{label}</title>{markup}</svg>\n')
cp=root/'art/CREDITS.json'; c=json.loads(cp.read_text())
for n in ['logo',*['icon_'+k for k in icons]]:
 c['art/ui/'+n+'.svg']={'source':'original','license':'original','author':'Chikoritaa / GPT-6.2 Astra for Wake','modified':'Original custom vector paths. No third-party shapes, type outlines, or reference art.'}
cp.write_text(json.dumps(c,indent=2)+'\n')
