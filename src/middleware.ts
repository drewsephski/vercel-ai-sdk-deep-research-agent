import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
]);

export default clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|json|png|jpg|jpeg|gif|webp|svg|ico|ttf|woff|woff2|mp3|mp4|avi|mov|ogv|webm|zip|tar|gz|rar|iso|7z|txt|csv|doc|docx|xls|xlsx|ppt|pptx|pdf|php|py|rb|go|java|ts|tsx|jsx|c|cpp|h|hpp|cs|swift|kt|rs|dart|sql|graphql|yaml|yml|xml|json|toml|ini|cfg|conf|env|log|bak|tmp|temp|cache|lock|git|svn|hg|bzr|cvs|mercurial|darcs|fossil|bazaar)).*)',
    '/(api|trpc)(.*)',
  ],
};
