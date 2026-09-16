const { chromium } = require('playwright');
const fs = require('fs');
const assert = require('assert/strict');
const path = require('path');
const root = path.resolve(__dirname, '..');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const page=await browser.newPage({viewport:{width:420,height:800},acceptDownloads:true});
 const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 await page.setContent(fs.readFileSync(root+'/sidepanel.html','utf8').replace(/<script[\s\S]*?<\/script>/g,''));
 await page.addStyleTag({path:root+'/sidepanel.css'});
 await page.evaluate(()=>{
   window.setInterval=()=>0;
   const listeners={addListener(){}};
   window.testNotes=[{id:'n1',videoId:'video123',videoTitle:'GPU lesson',timestamp:'0:40',timestampSeconds:40,timestampedUrl:'https://www.youtube.com/watch?v=video123&t=40s',text:'Original quote',rawText:'Original quote'}];
   window.chrome={runtime:{onMessage:listeners,sendMessage:async m=>{
     if(m.action==='relayToContent')return {success:true,response:{currentTime:240,videoId:'video123'}};
     if(m.action==='getNotes')return {success:true,notes:window.testNotes.filter(n=>!m.videoId||n.videoId===m.videoId)};
     if(m.action==='updateNote'){Object.assign(window.testNotes.find(n=>n.id===m.noteId),{text:m.text,thoughts:m.thoughts});return {success:true};}
     if(m.action==='askTranscript'){window.lastQuestion=m;return {success:true,answer:'GPU means graphics processing unit in this context.'};}
     if(m.action==='saveNote'){window.lastSaved=m;return {success:true};}
     return {success:true};
   }},storage:{local:{get:async()=>({}),set:async()=>{}},session:{get:async()=>({}),set:async()=>{}}},tabs:{onUpdated:listeners,onActivated:listeners},windows:{getCurrent:async()=>({id:1})}};
 });
 await page.addScriptTag({path:root+'/sidepanel.js'});
 await page.evaluate(()=>{
  currentVideoId='video123';currentVideoTitle='GPU lesson';currentChannelName='Test';
  currentTranscript=Array.from({length:12},(_,i)=>({start:i*40,duration:0,text:`Paragraph ${i}: We use GPUs for training and this paragraph gives a complete explanation of their role in computing.`}));
  setupEventListeners();renderTranscript();setupExplainFeature();showState('results');
 });
 assert.equal(await page.locator('.transcript-question-dock').isVisible(),true);
 // Select several complete rows, including timestamp nodes, and save exact text.
 await page.evaluate(()=>{const rows=document.querySelectorAll('.transcript-entry');const range=document.createRange();range.setStartBefore(rows[0]);range.setEndAfter(rows[2]);const selection=getSelection();selection.removeAllRanges();selection.addRange(range);document.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));});
 await page.locator('.selection-note-btn').click();
 const saved=await page.evaluate(()=>window.lastSaved);
 assert(saved.selectedText.includes('Paragraph 0'));assert(saved.selectedText.includes('Paragraph 2'));
 assert(!saved.selectedText.includes('0:40'));assert.equal(saved.timestamp,0);
 // Follow playback must use the fresh timestamp, even with a stale highlight.
 await page.evaluate(()=>{getSelection().removeAllRanges();highlightActiveEntry(0);autoScrollEnabled=false;document.getElementById('followPlaybackBtn').style.display='block';});
 await page.locator('#followPlaybackBtn').click();
 await page.waitForFunction(()=>document.querySelector('.active-playback')?.dataset.seconds==='240');
 await page.waitForFunction(()=>{const row=document.querySelector('.active-playback').getBoundingClientRect();const area=document.getElementById('contentArea').getBoundingClientRect();return row.top>=area.top && row.bottom<=area.bottom;});
 assert.equal(await page.locator('.active-playback').getAttribute('data-seconds'),'240');
 // Scroll to a middle row and ask; assert exactly +/- three displayed paragraphs.
 await page.evaluate(()=>{getSelection().removeAllRanges();const rows=document.querySelectorAll('.transcript-entry');const area=document.getElementById('contentArea');area.scrollTop+=rows[5].getBoundingClientRect().top-area.getBoundingClientRect().top;});
 await page.locator('#transcriptQuestion').fill('What does GPU mean?');
 await page.locator('#transcriptQuestionForm button').click();
 await page.locator('#saveTranscriptAnswer').waitFor({state:'visible'});
 const question=await page.evaluate(()=>window.lastQuestion);
 assert(question.transcriptContext.includes('Paragraph 2'));assert(question.transcriptContext.includes('Paragraph 8'));assert(!question.transcriptContext.includes('Paragraph 1:'));assert(!question.transcriptContext.includes('Paragraph 9:'));
 await page.screenshot({path:'/tmp/ytd-qa-preview.png'});
 await page.locator('#saveTranscriptAnswer').click();
 assert((await page.evaluate(()=>window.lastSaved.selectedText)).includes('AI answer:'));
 await page.evaluate(()=>{switchTab('notes');renderNotes(window.testNotes,'video123');});
 await page.locator('.note-edit').click();
 await page.locator('textarea[name=text]').fill('My edited quotation');
 await page.locator('textarea[name=thoughts]').fill('Could this apply to my work?');
 await page.locator('.note-editor button[type=submit]').click();
 await page.locator('.note-thoughts').filter({hasText:'Could this apply'}).waitFor();
 const downloadEvent=page.waitForEvent('download');await page.locator('#exportNotes').click();const download=await downloadEvent;const file=await download.path();const exported=fs.readFileSync(file,'utf8');
 assert(exported.includes('My edited quotation'));assert(exported.includes('Could this apply to my work?'));assert(exported.includes('&t=40s'));
 await page.screenshot({path:'/tmp/ytd-notes-preview.png'});
 // Edge context stays bounded to the available rows.
 await page.evaluate(()=>{switchTab('transcript');});
 await page.evaluate(()=>{const area=document.getElementById('contentArea');area.scrollTop=0;});
 const edge=await page.evaluate(()=>captureQuestionContext());
 assert(edge.transcriptContext.includes('Paragraph 3:'));assert(!edge.transcriptContext.includes('Paragraph 4:'));
 // Follow retries remain available if the video cannot be read.
 await page.evaluate(async()=>{youtubeTabId=7;chrome.tabs.sendMessage=async()=>({currentTime:null});await followPlayback();});
 assert.equal(await page.locator('#followPlaybackBtn').textContent(),'Retry follow playback');
 assert.deepEqual(errors,[]);
 console.log('UI checks passed: multi-row selection, pinned dock, 7-paragraph context, Q&A save, note edits/thoughts, Markdown download.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
