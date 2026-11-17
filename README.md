# College Space — Yale

Storage and parking for life around Yale. Students describe what they need. SpaceMatch asks Grok to read that request, then College Space filters a fictional New Haven sample catalog and explains the listings that actually matched.

Sample listings, hosts, and prices are illustrative. Nothing here collects payment. 

## Built with Grok

Hackathon development in Cursor used Grok. SpaceMatch calls the xAI API from the server (`grok-4.7` unless `XAI_MODEL` is set) to extract requirements and explain matches. Listing facts, availability, and prices come from the sample catalog. Grok does not create listings.

<img width="965" height="752" alt="Screenshot 2026-11-17 at 6 52 47 PM" src="https://github.com/user-attachments/assets/edabbdde-eae2-4b73-bdc3-4edf49ff020f" />


## Run the demo

```bash
cd web
npm install
npm test
npm run dev
```

Open `/find`. Without `XAI_API_KEY`, SpaceMatch says so and uses a labeled local parser. It does not describe that parser as Grok. With the key set only on the server, the same page calls the xAI API. `XAI_MODEL` defaults to `grok-4.7`. `XAI_API_BASE_URL` defaults to `https://api.x.ai/v1`. Do not put the key in `NEXT_PUBLIC_` variables or in Git.
