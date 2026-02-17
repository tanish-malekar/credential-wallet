import { useEffect, useState } from 'react';
type Session={authenticated:boolean;issuer?:string;expiresAt?:string};
type Credential={id:string;title:string;kind:string;status:string;issued_at:string;expires_at:string};
type Consent={profile:boolean;email:boolean};
type Claims={name?:string;email?:string;emailVerified?:boolean};
class SessionExpired extends Error {}
async function api<T>(path:string,init?:RequestInit):Promise<T>{
 let headers:Record<string,string>={'Content-Type':'application/json'};
 if(init?.method && init.method!=='GET') {
  const response=await fetch('/api/csrf');
  if(!response.ok) throw new Error('Unable to establish request protection. Please refresh.');
  const csrf: {headerName:string;token:string}=await response.json();headers[csrf.headerName]=csrf.token;
 }
 const response=await fetch(`/api/${path}`,{...init,headers});
 if(response.status===401) throw new SessionExpired('Your session has expired. Sign in again.');
 if(!response.ok) throw new Error(`The request could not be completed (${response.status}).`);
 return response.json();
}
export default function App(){
 const [session,setSession]=useState<Session>({authenticated:false});
 const [credentials,setCredentials]=useState<Credential[]>([]);
 const [consent,setConsent]=useState<Consent>({profile:false,email:false});
 const [claims,setClaims]=useState<Claims>({});
 const [busy,setBusy]=useState(true);
 const [error,setError]=useState('');
 const [message,setMessage]=useState('');
 const [revoking,setRevoking]=useState<string|null>(null);
 function handleError(e:unknown){
  if(e instanceof SessionExpired){setSession({authenticated:false});setCredentials([]);setClaims({});setConsent({profile:false,email:false});}
  setError(e instanceof Error?e.message:'An unexpected error occurred.');
 }
 async function load(){
  const current=await api<Session>('session');setSession(current);
  if(current.authenticated){const [cards,permissions,profile]=await Promise.all([api<Credential[]>('credentials'),api<Consent>('consent'),api<Claims>('profile')]);setCredentials(cards);setConsent(permissions);setClaims(profile);}
 }
 useEffect(()=>{load().catch(handleError).finally(()=>setBusy(false));if(new URLSearchParams(window.location.search).get('login')==='failed')setError('Sign-in failed or was canceled. Please try again.');},[]);
 useEffect(()=>{if(!session.authenticated)return;const timer=window.setInterval(()=>{api<Session>('session').then(s=>{if(!s.authenticated)handleError(new SessionExpired('Your session has expired. Sign in again.'));}).catch(handleError);},60000);return()=>clearInterval(timer);},[session.authenticated]);
 async function saveConsent(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');setMessage('');try{await api('consent',{method:'PUT',body:JSON.stringify(consent)});setClaims(await api<Claims>('profile'));setMessage('Sharing preferences saved.');}catch(e){handleError(e);}finally{setBusy(false);}}
 async function revoke(id:string){setBusy(true);setError('');try{await api(`credentials/${id}/revoke`,{method:'POST'});setCredentials(await api<Credential[]>('credentials'));setMessage('Demo credential revoked.');setRevoking(null);}catch(e){handleError(e);}finally{setBusy(false);}}
 async function logout(){setBusy(true);setError('');try{const csrf=await api<{headerName:string;token:string}>('csrf');const response=await fetch('/logout',{method:'POST',headers:{[csrf.headerName]:csrf.token}});if(!response.ok)throw new Error('Unable to sign out.');setSession({authenticated:false});setCredentials([]);setClaims({});setConsent({profile:false,email:false});setMessage('Signed out of CredVault.');}catch(e){handleError(e);}finally{setBusy(false);}}
 return <><a className="skip" href="#main">Skip to content</a><header><strong>CredVault<span className="dot">●</span></strong>{session.authenticated&&<button className="secondary" onClick={logout} disabled={busy}>Sign out</button>}</header><main id="main"><p className="eyebrow">YOUR ATTRIBUTES. YOUR CHOICE.</p><h1>A clearer view of your credentials.</h1><p className="lede">Keep your demo credentials in one place and choose which profile details this app can display.</p><p className="error" role="alert">{error}</p><p role="status">{busy?'Updating…':message}</p>
 {!session.authenticated?<section className="signin"><h2>Welcome to your wallet</h2><p>Sign in with the local identity provider. Credential cards are synthetic and do not establish real-world verification.</p><a className="button" href="http://localhost:8082/oauth2/authorization/wallet">Continue to sign in</a><p className="muted">Local demo: demo / demo-password</p></section>:<div className="grid"><section aria-labelledby="cards-title"><h2 id="cards-title">Your demo credentials</h2><div aria-busy={busy}>{credentials.map(c=><article className="card" key={c.id}><div className="card-top"><span>{c.kind}</span><span className={`badge ${c.status.toLowerCase()}`}>{c.status.toLowerCase()}</span></div><h3>{c.title}</h3><p>Sample issuer · educational use</p><dl><dt>Issued</dt><dd>{new Date(c.issued_at).toLocaleDateString()}</dd><dt>Expires</dt><dd>{new Date(c.expires_at).toLocaleDateString()}</dd></dl>{c.status==='ACTIVE'&&(revoking===c.id?<div className="confirm" role="group" aria-label="Confirm credential revocation"><p>Revoke this demo credential? This cannot be undone.</p><button disabled={busy} onClick={()=>revoke(c.id)}>Confirm revoke</button><button disabled={busy} className="secondary" onClick={()=>setRevoking(null)}>Cancel</button></div>:<button disabled={busy} className="secondary" onClick={()=>setRevoking(c.id)}>Revoke credential</button>)}</article>)}{!credentials.length&&!busy&&<p>No credentials to display.</p>}</div></section>
 <aside><form onSubmit={saveConsent}><h2>Sharing preferences</h2><p>These switches control which OIDC attributes CredVault exposes through its profile endpoint. They do not change identity-provider grants.</p><label><input type="checkbox" checked={consent.profile} onChange={e=>setConsent({...consent,profile:e.target.checked})}/>Display my name</label><label><input type="checkbox" checked={consent.email} onChange={e=>setConsent({...consent,email:e.target.checked})}/>Display my email address</label><button disabled={busy} type="submit">Save preferences</button></form><section className="profile"><h3>Shared profile</h3>{claims.name&&<p>Name: {claims.name}</p>}{claims.email&&<><p>Email: {claims.email}</p><p>Email verified by provider: {claims.emailVerified?'Yes':'No'}</p></>}{!claims.name&&!claims.email&&<p>No profile attributes shared.</p>}</section><p className="muted">Session idle timeout: 20 minutes. Signing out here ends this app session; it does not end your identity-provider session.</p></aside></div>}
 <footer>Independent educational project. No production identity data or real verified credentials.</footer></main></>;
}
