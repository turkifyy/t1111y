# ClipNow - Short Video Platform 🎥

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![GitHub stars](https://img.shields.io/github/stars/yourusername/clipnow)](https://github.com/yourusername/clipnow/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/yourusername/clipnow)](https://github.com/yourusername/clipnow/issues)

A TikTok-like short video platform with AI content creation tools, built with modern web technologies.

![ClipNow Screenshot](./public/screenshot.png)

## 🌟 Features

- 🎬 Short video feed with swipeable interface
- 🔥 AI-powered content recommendations
- 🚀 Real-time engagement metrics
- 📱 PWA support (installable on mobile)
- 🔔 Push notifications via OneSignal
- 📊 Creator analytics dashboard
- 🤖 AI video generator (beta)

## 🛠 Tech Stack

**Frontend:**
- React 18 + Vite
- Redux Toolkit (State management)
- Tailwind CSS + SCSS (Styling)
- Axios (HTTP client)
- OneSignal (Web push)

**Backend:**
- Firebase:
  - Authentication (Google/Email)
  - Firestore (Database)
  - Storage (Videos/Images)
  - Cloud Functions

**AI Services:**
- OpenAI API (Content suggestions)
- FFmpeg.wasm (Client-side video processing)

## 🚀 Quick Start

### Prerequisites
- Node.js v16+
- Firebase account
- OneSignal account
- OpenAI API key (optional)

### Installation
```bash
# Clone the repository
git clone https://github.com/yourusername/clipnow.git
cd clipnow

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
