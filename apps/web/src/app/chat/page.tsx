import { redirect } from 'next/navigation';

/**
 * Legacy standalone chat demo page.
 * Redirects to the production embeddable chat widget (/widget).
 */
export default function ChatPage() {
  redirect('/widget');
}
