const issues=[];const need=(key,check=Boolean)=>{if(!check(process.env[key]||''))issues.push(key);};
need('APP_ORIGIN',v=>/^https:\/\/[^/]+$/.test(v));need('DOMAIN');need('STRIPE_SECRET_KEY',v=>v.startsWith(process.env.STRIPE_MODE==='live'?'sk_live_':'sk_test_'));need('STRIPE_WEBHOOK_SECRET',v=>v.startsWith('whsec_'));need('PUBLIC_CONTACT_EMAIL');
if(issues.length){console.error('Missing or invalid launch settings: '+issues.join(', '));process.exitCode=1;}else console.log('Configuration checks passed. Run Stripe test checkout and verify webhook fulfillment before live launch.');
