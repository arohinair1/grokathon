# College Space — Yale

### A little more space for life at Yale.

**[Try the Live App](https://grokathon-blond.vercel.app/)**

## Inspiration

Every year during move-in, my parents drive me to Yale, and finding parking near campus is always a struggle. I've also had friends struggle to find affordable summer storage, especially when they only have a few boxes or small belongings that aren't worth paying for an entire storage unit.

Meanwhile, students living off campus often have extra closets, cupboards, or unused rooms. Some aren't subletting their houses over the summer, and even those who are may still have spare storage space. Similarly, driveways around campus often sit empty while visiting families struggle to find parking.

That got me thinking: **what if we could make better use of the space that already exists around Yale?**

**College Space** is meant to be a peer-to-peer marketplace connecting students who need storage or parking with students and local residents who have extra space.

It's mutually beneficial: renters get affordable, convenient options, while hosts can earn money from space they aren't using.

## How It Works

College Space brings storage and parking into one marketplace.

### Find Storage

Browse storage options around Yale, compare prices and locations, and find space for anything from a few boxes to larger belongings.

Rather than paying for an entire storage unit, students can explore smaller, more flexible options that better match their needs.

### Find Parking

Find driveway and off-street parking near campus, especially useful during move-in, graduation, Yale–Harvard weekends, and other busy events.

Users can browse parking listings, compare prices, and view details about available spaces.

### List Your Space

Students and local residents with unused space can use a guided listing flow to describe their storage or parking space, specify pricing and availability, and create a listing draft.

*Note: Listing creation is currently a prototype experience; public publishing and booking are not yet supported.*

## Powered by Grok SpaceMatch

One of the main features of College Space is **Grok SpaceMatch**, an AI-powered matching assistant built using xAI's Grok API.

Instead of manually searching through listings and filters, users can describe exactly what they're looking for in natural language.

**Example storage request:**

> I'm going home for the summer and need somewhere near Old Campus to store two suitcases and a few boxes for under $100 a month.

**Example parking request:**

> My parents are visiting Yale for graduation and need a driveway spot near campus for the weekend.

Grok interprets the user's request, identifies relevant preferences such as budget, location, duration, and space requirements, and recommends suitable listings with explanations.

The goal is to make finding storage or parking feel less like searching through a marketplace and more like asking someone who understands what you need.

## Demo Video

**[Watch the 60-Second College Space Demo]((https://www.youtube.com/watch?v=dD568mS6HZs))**

This walkthrough demonstrates the storage marketplace, parking discovery, Grok SpaceMatch, and the host listing experience.

## Grok in Action — Hackathon Screenshot

The following screenshot documents Grok being used in Cursor during the Yale Grokathon.

<img width="1156" height="713" alt="Screenshot 2026-11-17 at 7 12 29 PM" src="https://github.com/user-attachments/assets/f7abcc5b-3f20-4280-8ba7-54a76699d44c" />


## Current Prototype

College Space — Yale is an interactive hackathon prototype featuring:

- Storage and parking marketplace discovery
- Listing details and pricing information
- AI-assisted recommendations through Grok SpaceMatch
- Natural-language search for storage and parking
- A guided host listing-draft experience
- A responsive interface designed around Yale students

The current listings are illustrative demo data. The application is not yet a live marketplace supporting real reservations, payments, or publicly published host listings.

## Run Locally

Clone the repository:

```bash
git clone https://github.com/arohinair1/grokathon.git
cd grokathon/web
```

Install dependencies:

```bash
npm install
```

Create a `.env.local` file in `web/` and add your xAI API key:

```env
XAI_API_KEY=your_xai_api_key_here
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

**Note:** These instructions assume the Next.js application is in `web/`. Verify the current repository structure and any additional required environment variables before running.

## What's Next?

The longer-term vision is to make College Space a trusted student-to-student marketplace with verified hosts, persistent listings, real booking functionality, and support for additional college campuses.

For now, the prototype demonstrates how unused space around Yale could become a more affordable and convenient resource for the entire student community.
