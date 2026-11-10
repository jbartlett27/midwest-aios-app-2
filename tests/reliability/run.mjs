import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';import path from 'node:path';
process.chdir(path.dirname(fileURLToPath(import.meta.url)));
function run(args,{fail=false,env={}}={}){const result=spawnSync(process.execPath,args,{encoding:'utf8',env:{...process.env,...env},timeout:60000});if(result.error)throw result.error;const ok=fail?result.status!==0:result.status===0;if(!ok){process.stdout.write(result.stdout||'');process.stderr.write(result.stderr||'');throw new Error((fail?'Mutant survived: ':'Check failed: ')+args.join(' '));}if(!fail)process.stdout.write(result.stdout||'');else console.log('KILLED '+args.join(' '));}
run(['invariants.mjs']);
for(const tz of ['UTC','America/Chicago','America/Los_Angeles']){console.log('Timezone '+tz);for(const file of ['date-test.mjs','invoice-dates-test.mjs','ledger-test.mjs'])run([file],{env:{TZ:tz}})}
run(['job-patch-test.mjs']);run(['build-harness.mjs']);run(['render-test.mjs']);
run(['file-index-test.mjs']);run(['files-brain-test.mjs']);run(['vendor-catalog-test.mjs']);run(['catalog-ingest-test.mjs']);run(['catalog-api-test.mjs']);run(['vendor-catalog-brain-test.mjs']);
for(const file of ['date-test.mjs','invoice-dates-test.mjs','ledger-test.mjs','job-patch-test.mjs'])run([file,'--mutant'],{fail:true});
run(['file-index-test.mjs','--mutant'],{fail:true});for(let i=0;i<6;i++)run(['files-brain-test.mjs','--mutant',String(i)],{fail:true});
run(['vendor-catalog-test.mjs','--mutant'],{fail:true});run(['catalog-ingest-test.mjs','--mutant'],{fail:true});run(['catalog-api-test.mjs','--mutant'],{fail:true});for(let i=0;i<44;i++)run(['vendor-catalog-brain-test.mjs','--mutant',String(i)],{fail:true});
for(const mutation of ['stripe','dashboard','proforma']){run(['build-harness.mjs',mutation]);run(['render-test.mjs'],{fail:true})}
run(['build-harness.mjs']);run(['render-test.mjs']);
console.log('PASS complete reliability battery; all deliberate mutants rejected (7 invoice/date/dashboard, 8 file-index, 6 Files tab and Brain, 24 vendor catalogue module, 44 catalogue upload engine, 13 catalogue link and product-name server, 44 vendor catalogue page, upload dialog, Directory and Brain)');
