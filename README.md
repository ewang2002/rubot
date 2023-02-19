# Rubot 2.0

A bot for the Doomers server, or whatever Tony decided to call it.

## Features

rubot contains a bunch of completely random features, most of which aren't all that useful.

That being said, rubot does contain a variety of commands that UCSD students may find useful. For example, you can

-   see course information from the course catalog via the `/courseinfo` command.
-   get current enrollment counts and course offerings from WebReg via the `/lookuplive` and `/liveseats` commands.
-   see upcoming meetings via `/viewallclassrooms` and check for free classrooms via the `/freerooms` command.
-   get basic enrollment history information via `/plotoverall` and `/plotsection`.
-   get CAPE data via `/getcape`.

## Depends On

For UCSD-related components, rubot relies on the following projects/repositories:

| Project                                       | Reason                           | (Some) Associated Commands                          |
| --------------------------------------------- | -------------------------------- | --------------------------------------------------- |
| [UCSDHistEnrollData](https://bit.ly/ucsdhist) | Historical enrollment data.      | `/plotoverall`, `/plotsection`                      |
| [ucsd_webreg_rs](https://bit.ly/ucsdwebregrs) | Access to WebReg via web server. | `/lookuplive`, `/liveseats`                         |
| [UCSDCapeScraper](https://bit.ly/3G7kKQf)     | CAPE Data.                       | `/getcape`                                          |
| [uscdcourselist](https://bit.ly/3lwTQHW)      | Course catalog.                  | `/courseinfo`                                       |
| [wgtools](https://bit.ly/3NxLD2h)             | All offered courses.             | `/checkroom`, `/lookupcached`, `/viewallclassrooms` |

In particular, `ucsd_webreg_rs` (along with the [WebReg library](https://github.com/ewang2002/webweg)) is used to
scrape data from WebReg (which then goes to `UCSDHistEnrollData`) while also proving a simple web server so rubot
can make requests to this application and get the relevant data.

`wgtools`, `ucsdcourselist`, and `UCSDCapeScraper` provide CSV/TSV files that rubot reads from and caches.

`UCSDHistEnrollData` provides the images to the plots of course enrollment history.

## Hosting

rubot will remain a private bot for the time being, although I have plans to migrate all the UCSD-related commands
to a new bot and make that bot public.

While you're free to host rubot on your own, please note that most of the UCSD-related commands will not be usable
unless you obtain the data files on your own and set up the [web server](https://bit.ly/ucsdwebregrs).

Aside from what is available [here](https://bit.ly/ucsdhist) (the historical enrollment data), I will not be
providing any of the other data files due to various reasons. If you need them, obtain them yourself.

## License

Unless otherwise specified, all files in this repository here are listed under the **MIT** license.
