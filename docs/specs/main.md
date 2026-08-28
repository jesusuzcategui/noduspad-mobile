# NativeStreamDeck

> React Native Application mainly to use at tablet created by Jesus Uzcategui

## Main Goal

Create an Application for manage OBS and execute commands on any OS.

### Screen

This would to be a small application with few screens. bellow those decribe to it.

#### Login

The Screen should be have a login form with a title "Native Stream Deck" the form should be to have required email and password. This login should be to validate throught a email and password hashed on a .env variable.

#### Dashboard

After login, the dashboard screen should be to have a appbar with icons located at bottom side.

##### Appbar: The options.

- Home: The page where everything will appear. The idea is to have a Stream Deck with custom buttons in grid mode, organized by categories, with each category displaying a carousel of buttons.
  - Subpages:
    **Creation / Editing:** A drawer for creating buttons, which should allow you to enter or select: icon, background color, background image instead color, color de icon, por defecto sera blanco, label, OBS action, or custom command. Default category: OBS.
- Settings: Page where you configure the connection to OBS.
- About: Page with details on repository creation.

#### Nice to have

**Design:**  The idea is for it to be based on a dark, acrylic design.

**Behavior:** The idea is that when the screen is tapped, the command associated with each button is executed.

**Categories:** The idea is to ensure that each category assigned to a button is distinct and does not overlap. Each category should be displayed in a carousel using SlideJS. On a tablet in landscape mode, 6.4 should be visible; in portrait mode, 4.5. On a mobile device in portrait mode, 2.4 should be visible; in landscape mode, 3.5.

**Stream Deck Home Page:** The idea is to allow for sorting via drag-and-drop to organize the buttons within each category, as well as to arrange the categories themselves in the desired order.

**Button Designs:** Solid-color buttons with a pressed effect when tapped. The colors must be solid. If a background image is added, it should be displayed.

**Settings Page:** In addition to the OBS settings, we need to configure the border radius and gap values.

Translated with DeepL.com (free version)