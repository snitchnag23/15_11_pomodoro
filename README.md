# Pomodoro Art

A simple timer website with a bit of art in it.

## What the app is

A Pomodoro timer (a countdown that helps you focus). It shows a real painting from the Metropolitan Museum of Art in New York. The painting starts out very blurry and gets a little clearer every second as the time counts down. When the time runs out, the painting is fully sharp.

## How it works

- **Start** begins the countdown. A soft bell rings when the time is up.
- **Pause** stops the countdown. The button then says **Resume**, and pressing it carries on from where you stopped.
- **Reset** puts the timer back to the start, with the same painting and the blur back to strong.
- **At 00:00** the timer stops. The painting is fully sharp, and the page shows:
  - the painting's name
  - the artist
  - the year
  - a link to read more about the painting on the Met Museum website
- **Restart session** (shown at 00:00) loads a new painting and sets the timer back to the start.

The painting's name, artist, year and link stay hidden until the timer reaches 00:00.

**About the timer length:** it is set to 15 seconds for now, so it is quick to try out. The page has no way to change the length yet.

## Where the paintings come from

The paintings come from the Met's free Collection API (an online service that shares the museum's artwork information). No API key (a secret password for a service) is needed. The app only uses paintings that are in the public domain (free for anyone to use) and have a picture. Each time, it picks one at random.

## What happens when something goes wrong

If the Met can't be reached, the app does not show a message yet. The frame just stays empty and no painting appears. The timer still works as normal. Refreshing the page, or pressing **Restart session** after a run, tries again.

## The live link

[add live link here]

## Credits

- Paintings and their details: the Metropolitan Museum of Art, New York.
- Built by [your name].
