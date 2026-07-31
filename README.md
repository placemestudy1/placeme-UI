# PlaceMe Connect

Build a complete production-quality UI/UX for a SaaS application called PlaceMe.

PlaceMe is a platform where engineering students join live voice Group Discussions (GDs), collaborate in real time, and receive AI-powered individual feedback after each session.

IMPORTANT:

This project must include BOTH:

1. A responsive web application

   - Desktop (1440px)

   - Laptop (1280px)

   - Tablet (1024px)

   - Mobile Web (390px)

2. A native mobile application

   - iOS & Android

   - iPhone 16 Pro viewport (393×852)

   - Android-friendly layouts

   - Native navigation patterns

Do not only build the desktop version.

Generate dedicated mobile screens instead of simply shrinking the desktop layout.

------------------------------------------------

Design Style

• Premium SaaS

• Modern

• Dark theme

• Inspired by Linear, Notion, Discord, Spotify, Slack and Vercel

• Rounded corners

• Glassmorphism where appropriate

• Soft shadows

• Excellent spacing

• Premium typography

• Accessible contrast

------------------------------------------------

Create a reusable design system with:

• Buttons

• Inputs

• Cards

• Badges

• Dialogs

• Banners

• Empty States

• Error States

• Loading Skeletons

• Avatars

• Navigation

• Transcript Components

• Feedback Components

• Status Indicators

------------------------------------------------

Responsive Web Navigation

Desktop

- Left Sidebar

Tablet

- Top Navigation

Mobile Web

- Bottom Navigation

------------------------------------------------

Native Mobile Navigation

Use native mobile UX.

Main screens should have a persistent Bottom Tab Bar:

- Home

- New Room

- Join

- Random Match

- History

Secondary flows should use full-screen stacked navigation:

- Login

- Signup

- Consent

- Create Room

- Join Room

- Live Session

- Feedback

Do NOT use desktop sidebars inside the mobile application.

------------------------------------------------

Generate both Web and Native versions for these screens:

• Login

• Sign Up

• Home

• Mic Consent

• Create Room

• Join Room

• Random Match

• Room Lobby

• Live Session

• Session Ended

• History

• Not Found

For every screen include:

Desktop Layout

Tablet Layout

Mobile Web Layout

Native Mobile Layout

------------------------------------------------

Populate the application with realistic demo data including:

Room codes

Participants

Topics

Transcripts

AI Feedback

Statistics

Dates

Durations

------------------------------------------------

The mobile application should look like a real App Store application while the web version should look like a premium SaaS dashboard.

Maintain one shared design system but adapt layouts according to platform conventions instead of simply resizing components.

Generate reusable components and production-ready React code.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f560dd05-f83f-4764-94a0-2e15f30462e3).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
