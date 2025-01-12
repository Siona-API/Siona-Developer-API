// auth.config.ts
import type { NextAuthConfig } from 'next-auth';

export interface WalletSession {
  address: string;
  chainId: string;
  signature?: string;
  lastActive: Date;
}

export const authConfig = {
  pages: {
    signIn: '/login',
    newUser: '/',
    connectWallet: '/connect-wallet',
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isWalletConnected = !!auth?.wallet;
      const isOnChat = nextUrl.pathname.startsWith('/');
      const isOnRegister = nextUrl.pathname.startsWith('/register');
      const isOnLogin = nextUrl.pathname.startsWith('/login');
      const isOnWallet = nextUrl.pathname.startsWith('/connect-wallet');

      // Handle wallet routes
      if (isWalletConnected && isOnWallet) {
        return Response.redirect(new URL('/', nextUrl as unknown as URL));
      }

      // Handle traditional auth routes
      if (isLoggedIn && (isOnLogin || isOnRegister)) {
        return Response.redirect(new URL('/', nextUrl as unknown as URL));
      }

      if (isOnRegister || isOnLogin || isOnWallet) {
        return true;
      }

      if (isOnChat) {
        if (isLoggedIn || isWalletConnected) return true;
        return false;
      }

      if (isLoggedIn || isWalletConnected) {
        return Response.redirect(new URL('/', nextUrl as unknown as URL));
      }

      return true;
    },
  },
} satisfies NextAuthConfig;