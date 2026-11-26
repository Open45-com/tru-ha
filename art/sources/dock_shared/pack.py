"""Losslessly repack all other streams, round linear FLOAT colors to normalized U16.
Source color precision retained to 1/65535. No codec, GPU extension or runtime dependency."""
import json,struct
from pathlib import Path
def pack(path):
 path=Path(path);buf=path.read_bytes();n=struct.unpack_from('<I',buf,12)[0];g=json.loads(buf[20:20+n]);bin=buf[28+n:];ids={p['attributes']['COLOR_0'] for m in g['meshes'] for p in m['primitives'] if 'COLOR_0' in p['attributes']};views={g['accessors'][i]['bufferView']:i for i in ids}; new=bytearray()
 for j,v in enumerate(g['bufferViews']):
  off=v.get('byteOffset',0);data=bin[off:off+v['byteLength']]
  if j in views:
   a=g['accessors'][views[j]]
   if a['componentType']==5126:
    assert 'byteStride' not in v and a.get('byteOffset',0)==0
    vals=struct.iter_unpack('<f',data);data=b''.join(struct.pack('<H',round(max(0,min(1,x))*65535)) for (x,) in vals);a.update(componentType=5123,normalized=True)
  new+=bytes((-len(new))%4);v.update(byteOffset=len(new),byteLength=len(data));new+=data
 g['buffers'][0]['byteLength']=len(new);new+=bytes((-len(new))%4)
 js=json.dumps(g,separators=(',',':'),ensure_ascii=False).encode();js+=b' '*((-len(js))%4)
 path.write_bytes(b'glTF'+struct.pack('<II',2,28+len(js)+len(new))+struct.pack('<I4s',len(js),b'JSON')+js+struct.pack('<I4s',len(new),b'BIN\0')+new)
