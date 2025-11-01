@@  app.post('/analyze-job', async (req, res) => {
-    const docString = JSON.stringify(relevantFeatures, null, 2);
-
-    const prompt = `You are a Frappe ERP expert coach.
-    ...
-    TUTORIAL: [step1|step2|step3|step4|step5]`;
-
-    const response = await openai.chat.completions.create({...});
-    const text   = response.choices[0].message.content;
-    const lines  = text.split('\n');
-
-    const tutorialLine = lines.find(l => l.includes('TUTORIAL:'))?.split(':')[1]?.trim() || 'Step1|Step2|Step3|Step4|Step5';
-
-    res.json({...});
+    /*  ---- 1. LLM still writes the copy/terminology ---- */
+    const docString = JSON.stringify(relevantFeatures, null, 2);
+    const prompt    = /* unchanged */;
+    const {choices} = await openai.chat.completions.create({...});
+
+    /*  ---- 2. Parse & clean tutorial text ---- */
+    const tutorialSteps =     choices[0].message.content
+            .match(/TUTORIAL:\s*\[(.*?)\]/i)?.[1]
+            ?.split('|').map(s=>s.trim()).filter(Boolean)
+            .slice(0,5) || ['Go to Buying','Click Purchase Order','Click New','Add Items','Save'];
+
+    /*  ---- 3.  Extract keyword we will try to find in the DOM
+                 (last word with letters / spaces only) ---- */
+    const extract = s => s.replace(/[^\w\s]/g,'').split(' ').pop();
+    const keywords = tutorialSteps.map(extract);
+
+    res.json({
+         tutorial : tutorialSteps,
+         keywords : keywords     // <‑‑ NEW: one‑word handle per step
+    });
 }
