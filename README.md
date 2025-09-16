# SyncChat

A real-time group chat and voice room application that intelligently matches users with like-minded people for meaningful conversations.

## 🚀 Features

### 💬 Chat & Communication
- **Real-time messaging** with instant delivery
- **Dynamic group matching** based on interests and preferences
- **Voice chat rooms** with high-quality audio
- **GIF integration** powered by Giphy API
- **Message moderation** and content filtering
- **Pinned messages** for important information

### 🎯 Smart Matching
- **AI-powered group formation** based on user preferences
- **Karma system** for quality user matching
- **Interest-based pairing** for relevant conversations
- **Automatic group lifecycle management**

### 🔒 Security & Privacy
- **End-to-end encryption** for secure communications
- **User authentication** with Supabase Auth
- **Content moderation** tools
- **Rate limiting** to prevent spam
- **Privacy-focused** design

### 📱 User Experience
- **Progressive Web App (PWA)** support
- **Responsive design** for all devices
- **Dark/Light theme** support
- **Real-time typing indicators**
- **Push notifications**
- **Offline capability**

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Radix UI** for accessible components
- **React Router** for navigation
- **React Query** for data fetching

### Backend & Database
- **Supabase** for backend services
- **PostgreSQL** database
- **Real-time subscriptions**
- **Edge functions** for serverless logic
- **Row Level Security (RLS)**

### Real-time Features
- **WebSocket connections** for live chat
- **Voice chat rooms** with WebRTC
- **Live typing indicators**
- **Real-time notifications**

### Deployment
- **Netlify** for hosting and deployment
- **Automatic builds** from GitHub
- **CDN distribution** for global performance

## 📋 Prerequisites

- **Node.js** 18+ 
- **npm** or **yarn**
- **Supabase** account and project
- **Stripe** account (for premium features)
- **Giphy** API key (for GIF support)

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/syncchat.git
cd syncchat
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
Copy the environment template and fill in your values:
```bash
cp env.example .env.local
```

Required environment variables:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GIPHY_API_KEY=your_giphy_api_key
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_key
```

### 4. Start Development Server
```bash
npm run dev
```

### 5. Build for Production
```bash
npm run build
```

## 🌐 Deployment

### Netlify (Recommended)
1. Connect your GitHub repository to Netlify
2. Set environment variables in Netlify dashboard
3. Deploy automatically on every push

### Manual Deployment
```bash
npm run build
# Upload dist/ folder to your hosting provider
```

## 📱 Features in Detail

### Group Matching Algorithm
- Analyzes user interests and preferences
- Creates balanced group compositions
- Adapts matching based on user feedback
- Maintains conversation quality

### Voice Chat Rooms
- High-quality audio with WebRTC
- Room management and moderation
- Participant controls and permissions
- Background noise reduction

### Karma System
- User reputation tracking
- Quality-based matching
- Community moderation tools
- Incentivizes positive interactions

## 🔧 Configuration

### Tailwind CSS
Customize colors, spacing, and components in `tailwind.config.ts`

### Vite
Build optimization settings in `vite.config.ts`

### Supabase
Database schema and functions in the `supabase/` directory

## 📊 Performance

- **Lazy loading** for optimal bundle size
- **Code splitting** for faster initial loads
- **Image optimization** and compression
- **Caching strategies** for better UX
- **Performance monitoring** and analytics

## 🤝 Contributing

This is a proprietary application. All rights reserved.

## 📄 License

All Rights Reserved - Copyright (c) 2024 SyncChat

## 📞 Support

For support and questions:
- Create an issue in the repository
- Contact: support@syncchat.com

## 🔮 Roadmap

- [ ] Advanced AI matching algorithms
- [ ] Video chat capabilities
- [ ] Mobile app development
- [ ] Enterprise features
- [ ] Multi-language support
- [ ] Advanced analytics dashboard

---

**Built with ❤️ using modern web technologies**





