import * as T from 'three';
export type Tag={name:string;point:T.Vector3;kind:string;subject:boolean};
export function overlay(canvas:HTMLCanvasElement,camera:T.Camera,items:Tag[],close:boolean,textureInfo:string){
 const c=canvas.getContext('2d')!,w=canvas.width,h=canvas.height,s=w/390;c.clearRect(0,0,w,h);c.save();c.scale(s,s);
 const H=h/s,W=390;const mono='ui-monospace, monospace',sans='system-ui, sans-serif';
 const text=(x:number,y:number,str:string,size=10,col='#c6d7e1',font=mono)=>{c.font=size+'px '+font;c.fillStyle=col;c.fillText(str,x,y);};
 const line=(x:number,y:number,x1:number,y1:number,col:string)=>{c.beginPath();c.strokeStyle=col;c.lineWidth=.8;c.moveTo(x,y);c.lineTo(x1,y1);c.stroke();};
 let grad=c.createLinearGradient(0,0,0,104);grad.addColorStop(0,'rgba(4,11,22,.88)');grad.addColorStop(1,'rgba(4,11,22,0)');c.fillStyle=grad;c.fillRect(0,0,W,104);
 grad=c.createLinearGradient(0,H-85,0,H);grad.addColorStop(0,'rgba(4,11,22,0)');grad.addColorStop(1,'rgba(4,11,22,.88)');c.fillStyle=grad;c.fillRect(0,H-85,W,85);
 // Very light framing vignette, independent of the model material response.
 const vign=c.createRadialGradient(W/2,H*.5,W*.1,W/2,H*.5,H*.65);vign.addColorStop(0,'rgba(0,0,0,0)');vign.addColorStop(1,'rgba(3,7,14,.28)');c.fillStyle=vign;c.fillRect(0,0,W,H);
 text(17,29,'W A K E     /     F I E L D   S T U D Y',9,'#b8d3df');
 text(17,59,close?'Subject orbit':'Night passage',26,'#f0eeea',sans);
 text(17,77,close?'SURFACE & SILHOUETTE':'HARBOR LIGHTING   /   PHONE CAMERA',8,'#97b2c1');
 text(323,30,'GATE 00',10,'#e2bc87');line(316,38,373,38,'#8c785e');
 const placed:{x:number;y:number;cw:number;ch:number}[]=[];
 for(const item of items){
  const q=item.point.clone().project(camera);if(q.z<0||q.z>1||Math.abs(q.x)>1.1||Math.abs(q.y)>1)continue;
  const px=(q.x+1)*W*.5,py=(1-q.y)*H*.5;
  const title=item.name.replaceAll('_',' ').toUpperCase(),bad=item.kind!=='LOADED';const col=bad?'#ed93d0':'#9ed2c5';
  c.font='10px '+mono;const cw=Math.max(c.measureText(title).width,c.measureText(item.kind).width)+18,ch=33;
  // Keep labels out of the meshes, and keep multiple nearby markers readable.
  const right=px<W*.50;let x=Math.min(W-cw-12,Math.max(12,right?px+19:px-cw-19)),y=Math.min(H-85,Math.max(95,py-48));
  for(let k=0;k<6&&placed.some(a=>x<a.x+a.cw+4&&x+cw+4>a.x&&y<a.y+a.ch+3&&y+ch+3>a.y);k++)y+=ch+4;
  placed.push({x,y,cw,ch});line(px,py,right?x:x+cw,y+ch*.5,'#92a8baa0');
  c.fillStyle='rgba(5,14,25,.86)';c.fillRect(x,y,cw,ch);line(x,y,x,y+ch,col);text(x+7,y+13,title,10,'#e3e9ed');text(x+7,y+25,item.kind,8,col);
 }
 line(17,H-58,373,H-58,'#6e91a34d');text(18,H-38,close?'03    /    ORBIT INSPECTION':'01    /    NIGHT CALIBRATION',10,'#e0bb87');
 text(18,H-19,textureInfo,8,'#acbecb');text(280,H-38,close?'ORBIT CAM':'55° DOWN',10,'#d0e1eb');
 text(280,H-19,'40° VERTICAL FOV',8,'#acbecb');c.restore();
}
