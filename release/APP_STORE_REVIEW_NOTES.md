# App Store Review Notes — AI Menu APP 1.0

Submission ID: `8326bcf9-b05a-4b51-9019-2906d8a842b5`

Replace the bracketed demo credentials and attach the required physical-device
screen recording before resubmitting.

## Reply to App Review

AI Menu APP helps restaurant customers understand unfamiliar menus. Users can
photograph a menu, select an image or document, or paste a public menu URL. The
app extracts menu structure, translates dish names and descriptions, preserves
prices, provides optional dish details, and helps users prepare an order list.
The target audience is travelers, multilingual diners, and anyone who needs
help understanding restaurant menu content.

The core menu-analysis flow can be used without an account. An account is only
needed to synchronize profile preferences, saved menu history, and the order
list.

The app does not provide a public social feed, messaging, or other
user-generated-content publishing features, so there is no UGC moderation flow
for reviewers to test.

### Reviewer access and typical flow

1. Launch AI Menu APP.
2. Select the source and target languages.
3. Tap **Take Picture**, **Select from File**, or paste a public restaurant menu
   URL.
4. Tap **Analyze Menu** and wait for the translated result.
5. Open a dish for details or add it to the order list.
6. Open **Preferences** from the floating bottom toolbar.
7. When signed out, the account row opens the Sign In screen. When signed in,
   it opens Profile Settings.
8. Account deletion is available in Profile Settings. It asks for confirmation
   and permanently deletes the authenticated account and associated app data.

No special hardware or sample file is required beyond an internet connection
and any readable restaurant menu photo, document, or public menu URL.

Demo account:

- Email: `[ADD ACTIVE REVIEW ACCOUNT EMAIL]`
- Password: `[ADD ACTIVE REVIEW ACCOUNT PASSWORD]`

### External services

- Render: API hosting.
- Supabase: authentication, database, and file storage.
- Google Cloud Document AI and Cloud Vision: document and image text extraction.
- Google Cloud Translation and Gemini: translation and menu analysis.
- OpenRouter and OpenAI: configured AI and image-processing fallbacks.
- Pexels, Unsplash, and Wikimedia Commons: optional illustrative dish images.
- Google AdMob and User Messaging Platform: advertising and consent choices.
- FreeIPAPI: approximate country lookup for the default currency symbol.

The same feature set and content are presented in all supported App Store
regions. Internet access and availability of the external services listed above
are required; response time can vary by network and provider availability.

The app is not intended for a regulated industry and does not provide medical
advice. Allergy, ingredient, price, and AI-generated information must be
confirmed with the restaurant.

## Required physical-device recording checklist

Record on a physical iPhone running the latest available iOS version. The video
must begin at app launch and show:

- guest menu photo or file selection;
- menu analysis and translated result;
- dish details and adding/removing an item from the order list;
- Preferences, language switching, light/dark appearance, and legal pages;
- account registration and sign in;
- Profile Settings and sign out;
- account deletion confirmation and successful deletion using a disposable
  test account;
- an ad placement that does not cover the floating bottom toolbar.

Upload the recording in the App Review message and paste the reply above into
both the message and the App Review Information **Notes** field.
