export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!API_KEY) return res.status(500).json({ error: { message: 'ANTHROPIC_API_KEY not set' } });

  try {
    const { image_data, media_type, scan_type, extra_context } = req.body;
    if (!image_data) return res.status(400).json({ error: { message: 'image_data (base64) required' } });

    const prompts = {
      vendor_invoice: `You are a document scanner for Midwest Educational Furnishings. Extract ALL data from this vendor invoice/bill. Return ONLY valid JSON, no markdown fences, no explanation. Format:
{"vendor":"","invoice_number":"","date":"YYYY-MM-DD","due_date":"YYYY-MM-DD","po_number":"","subtotal":0,"tax":0,"shipping":0,"total":0,"items":[{"description":"","quantity":1,"unit_cost":0,"extended":0}],"notes":""}
If a field is not visible, use empty string or 0. Extract every line item you can see.`,
      
      delivery_receipt: `You are a document scanner. Extract ALL data from this delivery receipt/packing slip. Return ONLY valid JSON, no markdown fences. Format:
{"vendor":"","delivery_date":"YYYY-MM-DD","po_number":"","carrier":"","tracking":"","items":[{"description":"","quantity_shipped":0,"quantity_received":0,"condition":"good"}],"notes":"","signature":""}
Extract every item listed. If quantities aren't shown, estimate from the document.`,
      
      quote_document: `You are a document scanner for a furniture dealer. Extract ALL data from this quote/proposal. Return ONLY valid JSON, no markdown fences. Format:
{"vendor":"","quote_number":"","date":"YYYY-MM-DD","valid_until":"","customer":"","items":[{"tag":"","manufacturer":"","model":"","description":"","color":"","quantity":1,"list_price":0,"net_cost":0,"sell_price":0}],"subtotal":0,"tax":0,"total":0,"notes":""}
Extract every line item. For furniture, capture manufacturer, model number, color/finish when visible.`,
      
      general: `You are a document scanner. Extract ALL meaningful data from this document. Return ONLY valid JSON, no markdown fences. Format:
{"document_type":"","date":"","from":"","to":"","reference_number":"","amount":0,"items":[{"description":"","quantity":0,"amount":0}],"summary":"one sentence summary","raw_text":"key text content"}
Identify the document type (invoice, receipt, PO, quote, letter, etc.) and extract all relevant fields.`,

      customer_list: `You are a data extractor. Extract ALL customer/organization data from this document. Return ONLY valid JSON, no markdown fences. Format:
{"customers":[{"name":"","contact":"","email":"","phone":"","address":"","city":"","state":"","zip":"","type":"School District"}]}
Extract every customer/organization listed. Type should be: School District, Private School, Charter School, University, or Other.`,

      vendor_list: `You are a data extractor. Extract ALL vendor/supplier data from this document. Return ONLY valid JSON, no markdown fences. Format:
{"vendors":[{"name":"","contact":"","email":"","phone":"","category":"Furniture","website":""}]}
Extract every vendor/manufacturer listed.`
    };

    const systemPrompt = prompts[scan_type] || prompts.general;
    
    // Route content by media type:
    // - text/plain: send as text (Excel-to-text conversion)
    // - application/pdf: send as document type (Claude native PDF support)
    // - image/*: send as image type (vision)
    let userContent;
    if (media_type === 'text/plain') {
      const textData = Buffer.from(image_data, 'base64').toString('utf-8');
      userContent = [
        { type: "text", text: (extra_context ? extra_context + "\n\n" : "") + "Here is the spreadsheet data:\n\n" + textData + "\n\nExtract all data. Return ONLY valid JSON." }
      ];
    } else if (media_type === 'application/pdf') {
      userContent = [
        { type: "document", source: { type: "base64", media_type: "application/pdf", data: image_data } },
        { type: "text", text: (extra_context ? extra_context + "\n\n" : "") + "Extract all data from this document. Return ONLY valid JSON." }
      ];
    } else {
      // image/png, image/jpeg, image/gif, image/webp
      const safeType = ['image/jpeg','image/png','image/gif','image/webp'].includes(media_type) ? media_type : 'image/png';
      userContent = [
        { type: "image", source: { type: "base64", media_type: safeType, data: image_data } },
        { type: "text", text: (extra_context ? extra_context + "\n\n" : "") + "Extract all data from this document. Return ONLY valid JSON." }
      ];
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content: userContent }],
      }),
    });
    
    const data = await response.json();
    
    if (data.error && data.error.type === 'not_found_error') {
      const r2 = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {'Content-Type':'application/json','x-api-key':API_KEY,'anthropic-version':'2023-06-01'},
        body: JSON.stringify({model:'claude-3-5-sonnet-20241022',max_tokens:4096,system:systemPrompt,messages:[{role:"user",content:userContent}]}),
      });
      return res.status(r2.status).json(await r2.json());
    }
    
    return res.status(response.status).json(data);
  } catch (error) {
    return res.status(500).json({ error: { message: 'Server error: ' + error.message } });
  }
}
