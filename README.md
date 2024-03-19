# MyAnimeList
Modules required to run this project:  
->npm  
->express  
->ejs  
->multer  
->nodemon (not necessary, but helpful)

Before trying to run, ensure that you have OracleDB installed in your system. Run the sql.txt file (In some cases, you may need to follow some ordering which I didn't maintain). We didn't use multi-threaded mechanism, so serving multiple user at once isn't possible. (You can try running the same server at two or many different ports manually). Set the username and password in the dbConfig.js according to your schema.
