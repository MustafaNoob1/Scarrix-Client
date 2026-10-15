import {nativeImage,dialog} from 'electron';
import fs from 'node:fs';
import {PNG} from 'pngjs';
const signature=Buffer.from([137,80,78,71,13,10,26,10]);
function dimensions(data:Buffer){
 if(data.length>2*1024*1024||data.length<24)throw new Error('Cape-Bild ist zu groß oder ungültig. Maximal 2 MB.');
 if(data.subarray(0,8).equals(signature)){if(data.toString('ascii',12,16)!=='IHDR')throw new Error('Der PNG-Dateikopf ist beschädigt.');return {kind:'png',width:data.readUInt32BE(16),height:data.readUInt32BE(20)};}
 if(data[0]===255&&data[1]===216&&data[2]===255){let offset=2;while(offset+4<data.length){if(data[offset++]!==255)throw new Error('Die JPG-Datei ist beschädigt.');while(data[offset]===255)offset++;const marker=data[offset++];if(marker===0xda||marker===0xd9)break;if(marker===0x01||marker>=0xd0&&marker<=0xd7)continue;const length=data.readUInt16BE(offset);if(length<2||offset+length>data.length)break;if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)&&length>=8)return {kind:'jpeg',width:data.readUInt16BE(offset+5),height:data.readUInt16BE(offset+3)};offset+=length;}throw new Error('Die JPG-Datei konnte nicht gelesen werden.');}
 throw new Error('Dieses Bild ist weder PNG noch JPG. Bitte im Bildprogramm als PNG/JPG exportieren; nur die Dateiendung umzubenennen reicht nicht.');
}
function image(data:Buffer){const info=dimensions(data);if(info.width<1||info.height<1||info.width>2048||info.height>2048)throw new Error('Cape-Bild darf maximal 2048×2048 Pixel groß sein.');let png:PNG;if(info.kind==='png'){try{png=PNG.sync.read(data,{checkCRC:true});}catch{throw new Error('Die PNG-Datei ist beschädigt. Bitte erneut als PNG exportieren.');}}else{const decoded=nativeImage.createFromBuffer(data);if(decoded.isEmpty())throw new Error('Die JPG-Datei ist beschädigt oder wird nicht unterstützt.');const size=decoded.getSize();if(size.width!==info.width||size.height!==info.height)throw new Error('Die Bildgröße ist ungültig.');png=PNG.sync.read(decoded.toPNG(),{checkCRC:true});}return {png,kind:info.kind};}
function pixel(source:PNG,x:number,y:number,target:PNG,tx:number,ty:number){const from=(y*source.width+x)*4,to=(ty*target.width+tx)*4;source.data.copy(target.data,to,from,from+4);}
// HD atlases retain their original detail; motifs use the same UV layout at up to 32x resolution.
export function normalizeCape(data:Buffer):{bytes:Buffer;message:string}{
 const {png,kind}=image(data);
 if(png.width>=64&&png.width%64===0&&png.width===png.height*2)return {bytes:kind==='png'?data:PNG.sync.write(png),message:`Cape-Textur mit ${png.width}×${png.height} Pixeln importiert.`};
 if(png.width===22&&png.height===17){const out=new PNG({width:64,height:32});out.data.fill(0);for(let y=0;y<17;y++)for(let x=0;x<22;x++)pixel(png,x,y,out,x,y);return {bytes:PNG.sync.write(out),message:'Alte 22×17-Cape-Textur auf 64×32 erweitert.'};}
 const scale=Math.min(32,Math.max(8,Math.ceil(Math.max(png.width/10,png.height/16))));
 const out=new PNG({width:64*scale,height:32*scale});out.data.fill(0);
 const width=10*scale,height=16*scale;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const sx=Math.max(0,Math.min(png.width-1,(x+.5)*png.width/width-.5)),sy=Math.max(0,Math.min(png.height-1,(y+.5)*png.height/height-.5));
  const x0=Math.floor(sx),y0=Math.floor(sy),fx=sx-x0,fy=sy-y0;
  for(let c=0;c<4;c++){
   const read=(px:number,py:number)=>png.data[(Math.min(png.height-1,py)*png.width+Math.min(png.width-1,px))*4+c];
   const value=Math.round((read(x0,y0)*(1-fx)+read(x0+1,y0)*fx)*(1-fy)+(read(x0,y0+1)*(1-fx)+read(x0+1,y0+1)*fx)*fy);
   out.data[((scale+y)*out.width+scale+x)*4+c]=value;
   out.data[((scale+y)*out.width+12*scale+x)*4+c]=value;
  }
 }
 for(let y=0;y<height;y++)for(let x=0;x<scale;x++){pixel(out,scale,scale+y,out,x,scale+y);pixel(out,11*scale-1,scale+y,out,11*scale+x,scale+y);}
 for(let y=0;y<scale;y++)for(let x=0;x<width;x++){pixel(out,scale+x,scale,out,scale+x,y);pixel(out,scale+x,17*scale-1,out,11*scale+x,y);}
 return {bytes:PNG.sync.write(out),message:`Bildmotiv als HD-Cape (${out.width}×${out.height} Pixel, Motiv ${width}×${height}) importiert.`};
}
export function capeTemplate(){const scale=16;const png=new PNG({width:64*scale,height:32*scale});png.data.fill(0);const fill=(x:number,y:number,w:number,h:number,color:number[])=>{for(let py=y*scale;py<(y+h)*scale;py++)for(let px=x*scale;px<(x+w)*scale;px++){const i=(py*png.width+px)*4;for(let c=0;c<4;c++)png.data[i+c]=color[c];}};fill(1,1,10,16,[217,44,69,255]);fill(12,1,10,16,[105,33,61,255]);fill(0,1,1,16,[70,82,106,255]);fill(11,1,1,16,[70,82,106,255]);fill(1,0,10,1,[250,127,135,255]);fill(11,0,10,1,[52,57,74,255]);return PNG.sync.write(png);}
export async function saveCapeTemplate(){const chosen=await dialog.showSaveDialog({defaultPath:'Scarrix-Cape-Vorlage.png',filters:[{name:'PNG-Cape-Vorlage',extensions:['png']}]});if(chosen.canceled||!chosen.filePath)return 'Vorlagen-Download abgebrochen.';const destination=/\.png$/i.test(chosen.filePath)?chosen.filePath:chosen.filePath+'.png';fs.writeFileSync(destination,capeTemplate(),{mode:0o600});return 'Cape-Vorlage gespeichert: '+destination+' · 1024×512 Pixel (Motiv 160×256). Rot = Vorderseite, Dunkelrot = Rückseite, schmale Streifen = Kanten. Transparente Fläche frei lassen.';}
