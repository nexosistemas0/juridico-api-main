process.env.DATAJUD_API_KEY='test-only-key';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {lookup,normalizeNumber,inferTribunal} from '../src/portal/datajud.js';
const number='00008323520184013202';
test('normalizes CNJ and validates checksum, punctuation and tribunal',()=>{
 assert.equal(normalizeNumber('0000832-35.2018.4.01.3202'),number);
 assert.equal(inferTribunal(number),'trf1');
 for(const invalid of ['123','00000000000000000000','00008323420184013202','abc'+number])assert.throws(()=>normalizeNumber(invalid));
});
test('DataJud exact number, duplicates, timestamps and origin',async()=>{
 let calls=0;
 const fetcher=async(url:any,options:any)=>{calls++;assert.equal(url,'https://api-publica.datajud.cnj.jus.br/api_publica_trf1/_search');assert.equal(JSON.parse(options.body).query.match.numeroProcesso,number);return new Response(JSON.stringify({hits:{hits:[{_source:{numeroProcesso:number,grau:'G1',movimentos:[{nome:'Conclusão',codigo:1,dataHora:'2026-01-01T10:00:00Z'},{nome:'Conclusão',codigo:1,dataHora:'2026-01-01T10:00:00Z'},{nome:'Bad date',dataHora:'invalid'}]}},{_source:{numeroProcesso:'123',movimentos:[{nome:'Wrong',dataHora:'2026-01-01'}]}}]}}))};
 const data=await lookup(number,undefined,fetcher as any);assert.equal(data.movements.length,1);assert.equal(data.source,'CNJ / DataJud');assert.equal(calls,1);
 await assert.rejects(lookup(number,'https://evil.test',fetcher as any),{status:400});assert.equal(calls,1);
});
test('returns explicit not-found, invalid response, rate-limit and upstream errors',async()=>{
 await assert.rejects(lookup(number,undefined,(async()=>new Response('{"hits":{"hits":[]}}')) as any),{status:404});
 await assert.rejects(lookup(number,undefined,(async()=>new Response('{}')) as any),{status:502});
 await assert.rejects(lookup(number,undefined,(async()=>new Response('',{status:429})) as any),{status:429});
 await assert.rejects(lookup(number,undefined,(async()=>{throw new Error('Timeout')}) as any),{status:502});
});
