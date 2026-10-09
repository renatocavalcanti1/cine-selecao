import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
 testDir:'./tests/e2e',fullyParallel:false,reporter:[['list'],['html',{open:'never'}]],
 use:{baseURL:'http://127.0.0.1:5180',trace:'retain-on-failure'},
 projects:[{name:'desktop',use:{...devices['Desktop Chrome']}},{name:'mobile',use:{...devices['iPhone 13'],defaultBrowserType:'chromium'}}],
 webServer:process.env.CINE_E2E_EXTERNAL_SERVER==='1'?undefined:{command:'node node_modules/next/dist/bin/next dev --webpack --port 5180 --hostname 127.0.0.1',env:{CINE_E2E:'1'},url:'http://127.0.0.1:5180',reuseExistingServer:false,timeout:45000},
});
