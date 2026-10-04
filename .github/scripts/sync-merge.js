/* Three-way merge: unchanged local fields accept cloud updates; changed fields keep local edits.
   Record arrays merge by id, so unrelated edits and deletions do not replace whole modules. */
(function(root){
  const missing=Symbol('missing');
  // PostgreSQL JSONB reorders object keys. Compare values, preserving array order.
  function equal(a,b){
    if(a===b)return true;
    if(a===missing||b===missing||a===null||b===null||typeof a!=='object'||typeof b!=='object')return false;
    if(Array.isArray(a)||Array.isArray(b))return Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((v,i)=>equal(v,b[i]));
    const keys=Object.keys(a);
    return keys.length===Object.keys(b).length&&keys.every(k=>Object.hasOwn(b,k)&&equal(a[k],b[k]));
  }
  const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&v!==missing;
  const records=v=>Array.isArray(v)&&v.every(x=>object(x)&&x.id!==undefined);
  function merge(base,local,remote){
    if(equal(local,base))return remote;
    if(equal(remote,base)||equal(local,remote))return local;
    if(records(local)&&records(remote)&&(records(base)||base===missing)){
      const b=new Map((base===missing?[]:base).map(x=>[String(x.id),x])),l=new Map(local.map(x=>[String(x.id),x])),r=new Map(remote.map(x=>[String(x.id),x]));
      return [...new Set([...l.keys(),...r.keys(),...b.keys()])].flatMap(id=>{
        const value=merge(b.has(id)?b.get(id):missing,l.has(id)?l.get(id):missing,r.has(id)?r.get(id):missing);
        return value===missing?[]:[value];
      });
    }
    if(object(local)&&object(remote)&&(object(base)||base===missing)){
      const out={},b=base===missing?{}:base;
      for(const key of new Set([...Object.keys(b),...Object.keys(local),...Object.keys(remote)])){
        if(['__proto__','prototype','constructor'].includes(key))continue;
        const value=merge(Object.hasOwn(b,key)?b[key]:missing,Object.hasOwn(local,key)?local[key]:missing,Object.hasOwn(remote,key)?remote[key]:missing);
        if(value!==missing)out[key]=value;
      }
      return out;
    }
    // The same field changed on both devices: the later committing device wins.
    return local;
  }
  root.LOSSyncMerge={merge:(base,local,remote)=>merge(base||{},local||{},remote||{}),equal};
  if(typeof module==='object'&&module.exports)module.exports=root.LOSSyncMerge;
})(typeof window==='object'?window:globalThis);
