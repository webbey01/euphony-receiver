'use strict';
const NS = 'urn:x-cast:com.euphony.receiver';
const context = cast.framework.CastReceiverContext.getInstance();
const player = context.getPlayerManager();
context.addCustomMessageListener(NS, event => {
  const data=event.data||{};
  if(data.type==='now-playing-extras')applyExtras(data);
  if(data.type==='liked')setLiked(data.liked);
});
let extras={};
const el=id=>document.getElementById(id);
const text=(id,value)=>{el(id).textContent=value||''};
function fmt(value){value=Math.max(0,Math.floor(Number(value)||0));return `${Math.floor(value/60)}:${String(value%60).padStart(2,'0')}`;}
function setLiked(value){el('like').textContent=value?'♥':'♡';el('like').setAttribute('aria-pressed',String(!!value));}
function applyExtras(data){extras={...extras,...data};const palette=data.theme==='inferno'?['#ff6a18','#2a0c08']:data.theme==='rose'?['#ff78b7','#210d1c']:['#00d9ff','#07111b'];document.documentElement.style.setProperty('--accent',palette[0]);document.documentElement.style.setProperty('--glow',palette[0]+'55');document.documentElement.style.setProperty('--bg',palette[1]);text('lyrics',data.lyricsLine);setLiked(data.liked);const q=Array.isArray(data.queue)?data.queue:[];el('queue').replaceChildren(...q.slice(0,3).map(item=>{const div=document.createElement('div'),title=document.createElement('span'),artist=document.createElement('small');title.textContent=item.title||'';artist.textContent=item.artist||'';div.append(title,artist);div.tabIndex=0;div.setAttribute('role','button');div.addEventListener('click',()=>context.sendCustomMessage(NS,undefined,{action:'skip'}));return div;}));}
function showMedia(media){if(!media)return;const metadata=media.metadata||{},custom=media.customData?.euphony||{};text('title',metadata.title||'');text('artist',metadata.artist||'');text('album',metadata.albumName||'');el('art').src=metadata.images?.[0]?.url||'';text('duration',fmt(media.duration));applyExtras({...custom,title:metadata.title,artist:metadata.artist,album:metadata.albumName});}
player.addEventListener(cast.framework.events.EventType.PLAYER_LOAD_COMPLETE,event=>showMedia(event.data?.media));
player.addEventListener(cast.framework.events.EventType.MEDIA_STATUS,event=>{const media=player.getMediaInformation();if(media)showMedia(media);const time=player.getCurrentTimeSec()||0,duration=media?.duration||0;text('elapsed',fmt(time));el('fill').style.width=`${duration?Math.min(100,time/duration*100):0}%`;});
el('like').addEventListener('click',()=>context.sendCustomMessage(NS,undefined,{action:'like'}));
player.setMessageInterceptor(cast.framework.messages.MessageType.LOAD,request=>{const result=request;setTimeout(()=>showMedia(result.media),0);return result;});
context.start({disableIdleTimeout:false});
