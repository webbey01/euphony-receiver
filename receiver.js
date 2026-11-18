'use strict';
const NS = 'urn:x-cast:com.euphony.receiver';
const context = cast.framework.CastReceiverContext.getInstance();
const player = context.getPlayerManager();
context.addCustomMessageListener(NS, event => {
  const data=event.data||{};
  if(data.type==='now-playing-extras')applyExtras(data);
  if(data.type==='liked')setLiked(data.liked);
});
let extras={},duration=0,clock=null;
const el=id=>document.getElementById(id);
const text=(id,value)=>{el(id).textContent=value??''};
function finite(value,fallback=0){const n=Number(value);return Number.isFinite(n)&&n>=0?n:fallback;}
function fmt(value){value=Math.floor(finite(value));return `${Math.floor(value/60)}:${String(value%60).padStart(2,'0')}`;}
function setLiked(value){el('like').textContent=value?'♥':'♡';el('like').setAttribute('aria-pressed',String(!!value));}
function send(action){context.sendCustomMessage(NS,undefined,{action});}
function applyExtras(data){extras={...extras,...data};const palette=data.theme==='inferno'?['#ff6a18','#2a0c08']:data.theme==='rose'?['#ff78b7','#210d1c']:['#00d9ff','#07111b'];document.documentElement.style.setProperty('--accent',palette[0]);document.documentElement.style.setProperty('--glow',palette[0]+'55');document.documentElement.style.setProperty('--bg',palette[1]);text('lyrics',data.lyricsLine);setLiked(data.liked);const q=Array.isArray(data.queue)?data.queue:[];el('queue').replaceChildren(...q.slice(0,3).map(item=>{const div=document.createElement('div'),title=document.createElement('span'),artist=document.createElement('small');title.textContent=item.title||'';artist.textContent=item.artist||'';div.append(title,artist);div.tabIndex=0;div.setAttribute('role','button');div.addEventListener('click',()=>send('skip'));return div;}));}
function drawProgress(){const time=finite(player.getCurrentTimeSec?.()),total=duration; text('elapsed',fmt(time));el('fill').style.width=`${total>0?Math.min(100,time/total*100):0}%`;}
function showIdle(){clearInterval(clock);clock=null;duration=0;el('screen').classList.add('idle');el('art').removeAttribute('src');text('title','Ready');text('artist','');text('album','');text('elapsed','0:00');text('duration','0:00');text('lyrics','');text('queue','');el('queue').replaceChildren();el('fill').style.width='0%';el('transport').hidden=true;}
function showMedia(media){if(!media){showIdle();return;}el('screen').classList.remove('idle');el('transport').hidden=false;const metadata=media.metadata||{},custom=media.customData?.euphony||{};duration=finite(media.duration,finite(custom.duration));text('title',metadata.title||'');text('artist',metadata.artist||'');text('album',metadata.albumName||'');const art=metadata.images?.[0]?.url;if(art)el('art').src=art;else el('art').removeAttribute('src');text('duration',fmt(duration));applyExtras({...custom,title:metadata.title,artist:metadata.artist,album:metadata.albumName});drawProgress();}
function updatePlayback(){const state=player.getPlayerState?.();if(state==='IDLE'&&!player.getMediaInformation?.()){showIdle();return;}drawProgress();if(state==='PLAYING'){if(!clock)clock=setInterval(drawProgress,500);}else{clearInterval(clock);clock=null;}}
player.addEventListener(cast.framework.events.EventType.PLAYER_LOAD_COMPLETE,event=>{showMedia(event.data?.media||player.getMediaInformation());updatePlayback();});
player.addEventListener(cast.framework.events.EventType.MEDIA_STATUS,()=>{const media=player.getMediaInformation();if(media)showMedia(media);else if(player.getPlayerState?.()==='IDLE')showIdle();updatePlayback();});
el('like').addEventListener('click',()=>send('like'));
el('previous').addEventListener('click',()=>send('previous'));
el('play-pause').addEventListener('click',()=>{if(player.getPlayerState?.()==='PAUSED')player.play();else player.pause();});
el('next').addEventListener('click',()=>send('skip'));
el('seek').addEventListener('click',event=>{if(duration<=0)return;const bounds=event.currentTarget.getBoundingClientRect();player.seek(Math.max(0,Math.min(1,(event.clientX-bounds.left)/bounds.width))*duration);});
player.setMessageInterceptor(cast.framework.messages.MessageType.LOAD,request=>{setTimeout(()=>showMedia(request.media),0);return request;});
context.start({disableIdleTimeout:false});
