(function () {
  'use strict';

  // Prevent multiple instantiations
  if (window.__AI_SUPPORT_WIDGET_INITIALIZED__) return;
  window.__AI_SUPPORT_WIDGET_INITIALIZED__ = true;

  // Locate the loader script element and read configuration attributes
  const currentScript =
    document.currentScript ||
    (function () {
      const scripts = document.getElementsByTagName('script');
      for (let i = scripts.length - 1; i >= 0; i--) {
        if (scripts[i].src && scripts[i].src.indexOf('widget.js') !== -1) {
          return scripts[i];
        }
      }
      return null;
    })();

  const scriptSrc = currentScript ? currentScript.src : '';
  let defaultOrigin = 'https://theara-ai-support-agent.vercel.app';
  try {
    if (scriptSrc) {
      const url = new URL(scriptSrc);
      defaultOrigin = url.origin;
    }
  } catch (e) {}

  const config = {
    webUrl: (currentScript && currentScript.getAttribute('data-web-url')) || defaultOrigin,
    botName: (currentScript && currentScript.getAttribute('data-bot-name')) || 'AI Assistant',
    company: (currentScript && currentScript.getAttribute('data-company')) || 'Customer Support',
    primaryColor: (currentScript && currentScript.getAttribute('data-primary-color')) || '#0284c7',
    greeting: (currentScript && currentScript.getAttribute('data-greeting')) || 'Hi there! How can I help you today?',
    quickQuestions: (currentScript && currentScript.getAttribute('data-quick-questions')) || '',
    position: (currentScript && currentScript.getAttribute('data-position')) || 'bottom-right',
  };

  // Build target iframe URL
  const iframeUrl = new URL(`${config.webUrl}/widget`);
  iframeUrl.searchParams.set('botName', config.botName);
  iframeUrl.searchParams.set('company', config.company);
  iframeUrl.searchParams.set('primaryColor', config.primaryColor);
  iframeUrl.searchParams.set('greeting', config.greeting);
  if (config.quickQuestions) {
    iframeUrl.searchParams.set('quickQuestions', config.quickQuestions);
  }

  // Inject Stylesheet
  const styleEl = document.createElement('style');
  const isLeft = config.position === 'bottom-left';
  styleEl.textContent = `
    .ai-support-widget-bubble {
      position: fixed;
      bottom: 24px;
      ${isLeft ? 'left: 24px;' : 'right: 24px;'}
      width: 58px;
      height: 58px;
      border-radius: 50%;
      background-color: ${config.primaryColor};
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
      z-index: 2147483647;
      transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
    }
    .ai-support-widget-bubble:hover {
      transform: scale(1.06);
      box-shadow: 0 12px 28px rgba(0, 0, 0, 0.28);
    }
    .ai-support-widget-bubble:active {
      transform: scale(0.95);
    }
    .ai-support-widget-bubble svg {
      width: 28px;
      height: 28px;
      transition: transform 0.2s ease;
    }
    .ai-support-widget-bubble .ai-icon-close {
      display: none;
    }
    .ai-support-widget-bubble.ai-open .ai-icon-chat {
      display: none;
    }
    .ai-support-widget-bubble.ai-open .ai-icon-close {
      display: block;
    }
    .ai-support-widget-bubble .ai-pulse {
      position: absolute;
      top: 2px;
      right: 2px;
      width: 14px;
      height: 14px;
      background-color: #10b981;
      border: 2px solid #ffffff;
      border-radius: 50%;
    }
    .ai-support-widget-frame {
      position: fixed;
      bottom: 96px;
      ${isLeft ? 'left: 24px;' : 'right: 24px;'}
      width: 380px;
      height: 600px;
      max-width: calc(100vw - 32px);
      max-height: calc(100vh - 120px);
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 18px;
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.22);
      z-index: 2147483646;
      opacity: 0;
      transform: translateY(16px) scale(0.96);
      pointer-events: none;
      visibility: hidden;
      transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.25s;
    }
    .ai-support-widget-frame.ai-open {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: auto;
      visibility: visible;
    }
    @media (max-width: 480px) {
      .ai-support-widget-frame {
        bottom: 0 !important;
        left: 0 !important;
        right: 0 !important;
        top: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        max-width: 100vw !important;
        max-height: 100vh !important;
        border-radius: 0 !important;
      }
      .ai-support-widget-bubble.ai-open {
        display: none !important;
      }
    }
  `;
  document.head.appendChild(styleEl);

  // Create Bubble Button
  const bubble = document.createElement('div');
  bubble.className = 'ai-support-widget-bubble';
  bubble.setAttribute('role', 'button');
  bubble.setAttribute('aria-label', `Chat with ${config.botName}`);
  bubble.innerHTML = `
    <span class="ai-pulse"></span>
    <svg class="ai-icon-chat" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
    <svg class="ai-icon-close" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  `;

  // Create Iframe Container
  const iframe = document.createElement('iframe');
  iframe.className = 'ai-support-widget-frame';
  iframe.title = `${config.botName} Window`;
  iframe.src = iframeUrl.toString();

  let isOpen = false;

  function toggleWidget(forceState) {
    isOpen = typeof forceState === 'boolean' ? forceState : !isOpen;
    if (isOpen) {
      bubble.classList.add('ai-open');
      iframe.classList.add('ai-open');
    } else {
      bubble.classList.remove('ai-open');
      iframe.classList.remove('ai-open');
    }
  }

  bubble.addEventListener('click', function () {
    toggleWidget();
  });

  // Listen for postMessage from widget iframe to close
  window.addEventListener('message', function (event) {
    if (event.data === 'AI_SUPPORT_CLOSE_WIDGET') {
      toggleWidget(false);
    }
  });

  // Append elements to DOM once ready
  function mount() {
    document.body.appendChild(iframe);
    document.body.appendChild(bubble);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
