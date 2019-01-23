# アップデート方法

新しいバージョンを落としてきてファイルを置き換えたら、
index.jsとかpackage.jsonとか入ってるディレクトリでまたnpm installをする。

```
npm install
```

変更はbotサーバ再起動しないと反映されない。

nodeで直接index.js叩いてるならCtrl+Cで終わらせてまた起動するだけ。

pm2使ってるなら

```
sudo su
pm2 restart all
```

で再起動かかる。