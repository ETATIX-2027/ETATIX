import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cors={ 'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'GET, POST, OPTIONS' };
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
Deno.serve(async(req)=>{
  if(req.method==='OPTIONS') return new Response('ok',{headers:cors});
  if(!['GET','POST'].includes(req.method)) return reply({error:'METHOD_NOT_ALLOWED'},405);
  const url=Deno.env.get('SUPABASE_URL')!, anon=Deno.env.get('SUPABASE_ANON_KEY')!;
  const auth=req.headers.get('Authorization'); if(!auth) return reply({error:'AUTH_REQUIRED'},401);
  try{
    const sb=createClient(url,anon,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});
    const {data:{user},error:authError}=await sb.auth.getUser(); if(authError||!user) return reply({error:'INVALID_SESSION'},401);
    const {data,error}=await sb.from('etx_issued_tickets').select('id,ticket_code,status,checked_in_at,created_at,event:etx_events(title,start_at,venue_name,city),ticket_type:etx_ticket_types(name)').eq('owner_id',user.id).order('created_at',{ascending:false});
    if(error) throw error;
    return reply({success:true,tickets:data||[],count:data?.length||0});
  }catch(e){console.error(e);return reply({error:'TICKET_QUERY_FAILED'},500);}
});
