import { Show } from './Models/show';
import { Component } from '@angular/core';
import { Http } from '@angular/http';
import { Torrent } from './Models/torrent';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  public torrents: Array<Torrent> = [];
  public addInput = '';
  public lastTorrentParsed: Torrent;
  public shows: Array<Show> = JSON.parse(localStorage.getItem('shows')) || [];

  constructor(private http: Http) {
    this.start();
  }

  async start() {
    const waitFor = ms => new Promise(r => setTimeout(r, ms));
    const asyncForEach = async (array, callback) => {
      for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array);
      }
    };

    const start = async () => {
      await asyncForEach(this.shows, async show => {
        await waitFor(1500);

        console.log(show);
        this.grabTorrent(show.id);
      });
    };

    start();
  }

  getTorrentData(torrentId: string) {
    return this.http.get(`https://eztv.io/api/get-torrents?imdb_id=${torrentId}`);
  }

  saveShow($event) {

    let showId = this.addInput;
    const input = this.addInput.split('/');

    input.forEach((value: string, index: number) => {
      if (value.includes('tt')) {
        showId = value.replace( /^\D+/g, '');
      }
    });

    this.grabTorrent(showId).then((torrents: Array<Torrent>) => {
      const torrent = torrents[0];
      const show = new Show(torrent);
      show.id = showId;
      this.shows.push(show);
      localStorage.setItem('shows', JSON.stringify(this.shows));
    }).catch(error => {
      console.error(error);
    });
  }

  private grabTorrent(torrentId): Promise<any> {
    console.log('Fetching torrentId:', torrentId);

    return new Promise((resolve, reject) => {
      this.getTorrentData(torrentId).subscribe((result: any) => {
        const response = JSON.parse(result._body);

        if (response.torrents && response.torrents.length) {
          console.log(response.torrents);

          response.torrents.forEach((torrent: Torrent) => {
            torrent.date = new Date(torrent.date_released_unix * 1000);
            this.torrents.push(torrent);
          });

          this.torrents = this.torrents.sort(
            (a: Torrent, b: Torrent): number => {
              return a.date > b.date ? -1 : 1;
            }
          );

          resolve(response.torrents);
        } else {
          reject('No torrents for Id ' + torrentId + '!');
        }
      });
    });
  }

  deleteShow(show: Show) {
    this.shows.forEach((item: Show, index: number) => {
      if (item.id === show.id) {
        this.shows.splice(index, 1);
      }
    });

    localStorage.setItem('shows', JSON.stringify(this.shows));
  }
}