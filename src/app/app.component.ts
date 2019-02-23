import { Show } from './Models/show';
import { Component, OnInit } from '@angular/core';
import { Http } from '@angular/http';
import { Torrent } from './Models/torrent';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  public torrents: Array<Torrent> = [];
  public addInput = '';
  public lastTorrentParsed: Torrent;
  public shows: Array<Show> = JSON.parse(localStorage.getItem('shows')) || [];
  public progressbar: HTMLElement;
  public fetchBtn: HTMLElement;
  public limit = '10';

  constructor(private http: Http) {}

  ngOnInit() {
    this.progressbar = document.getElementById('progressbar');
    this.fetchBtn = document.getElementById('fetchBtn');
    // this.start();
  }

  async start() {
    this.fetchBtnStart();
    const waitFor = ms => new Promise(r => setTimeout(r, ms));
    const asyncForEach = async (array, callback) => {
      for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array);
      }
    };

    let iterator = 0;

    this.progressbar.setAttribute('aria-valuenow', '0');
    this.progressbar.style.width = '0%';
    this.progressbar.setAttribute('aria-valuemax', this.shows.length.toString());

    const fetchAll = async () => {
      await asyncForEach(this.shows, async show => {
        await waitFor(1500);

        this.progressbar.setAttribute('aria-valuenow', (++iterator).toString());
        const percent = (iterator / this.shows.length) * 100 + '%';
        this.progressbar.style.width = percent;
        this.grabTorrent(show.id, iterator, percent);
      });
    };

    fetchAll();
  }

  getTorrentData(torrentId: string) {
    return this.http.get(`https://eztv.io/api/get-torrents?imdb_id=${torrentId}&limit=${this.limit}`);
  }

  saveShow($event) {
    this.fetchBtnStart();
    let showId = this.addInput;
    const input = this.addInput.split('/');

    input.forEach((value: string, index: number) => {
      if (value.includes('tt')) {
        showId = value.replace(/^\D+/g, '');
      }
    });

    this.grabTorrent(showId)
      .then((torrents: Array<Torrent>) => {
        const torrent = torrents[0];
        const show = new Show(torrent);
        show.id = showId;
        this.shows.push(show);
        localStorage.setItem('shows', JSON.stringify(this.shows));
        this.addInput = '';
      })
      .catch(error => {
        this.fetchBtnStop();
        console.error(error);
      });
  }

  private grabTorrent(torrentId: string, iterator?: number, percent?: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.getTorrentData(torrentId).subscribe((result: any) => {
        const response = JSON.parse(result._body);

        if (response.torrents && response.torrents.length) {
          response.torrents.forEach((torrent: Torrent) => {
            torrent.date = new Date(torrent.date_released_unix * 1000);
            this.torrents.push(torrent);
          });

          this.torrents = this.torrents.sort(
            (a: Torrent, b: Torrent): number => {
              return a.date > b.date ? -1 : 1;
            }
          );

          this.progressbar.setAttribute('aria-valuenow', (iterator * 1000).toString());
          this.progressbar.style.width = percent;

          if (iterator === this.shows.length) {
            document.getElementsByClassName('progress')[0].classList.add('d-none');
            this.fetchBtnStop();
          }

          resolve(response.torrents);
        } else {
          this.fetchBtnStop();
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

  saveStorage() {
    localStorage.setItem('shows', JSON.stringify(this.shows));
  }

  fetchBtnStart() {
    this.fetchBtn.innerHTML = '<i class="fas fa-fw fa-spin fa-sync-alt"></i>';
  }

  fetchBtnStop() {
    this.fetchBtn.innerHTML = '<i class="fas fa-fw fa-sync-alt"></i> Fetch';
  }
}
