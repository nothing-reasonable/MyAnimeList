const express = require('express');
const bodyParser = require('body-parser');
const oracledb = require('oracledb');
const dbConfig = require('./dbConfig');
const multer = require('multer');
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './public')
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname)
    }
  })
  
  const upload = multer({ storage: storage })
oracledb.autoCommit = true;

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));
app.set('views', 'views');
app.set('view engine', 'ejs');


var freelist = [];
var loggedin = [];

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static(__dirname + '/public'));
app.set('views', 'views');
app.set('view engine', 'ejs');
app.use((req, res, next) => {
    if(loggedin.length != 0){
        res.locals.pro_pic = loggedin[0][5];
        res.locals.username = loggedin[0][1];
        res.locals.user_id = loggedin[0][0];
        res.locals.privilege = loggedin[0][3];
        res.locals.login_status = true;
        next();
    } else {
        res.locals.login_status = false;
        next();
    }
});

function loginCheck(req, res){
    if(loggedin.length === 0){
        res.redirect('/login');
    } else {
        if(loggedin[0][3] === 'Admin' || loggedin[0][3] === 'Moderator'){

        } else {
            res.redirect('/');
        }
    }
}

app.get('/fpt', async(req, res) => { 
    if(loggedin.length === 0){
        res.redirect('/login');
    } else if(loggedin[0][3] !== 'Admin'){
        res.redirect('/');
    } else {
        try{ 
            const connection = await oracledb.getConnection(dbConfig); 
            
            const data_t = await connection.execute(`SELECT * FROM FPT_LOG ORDER BY TIME DESC OFFSET 0 ROWS FETCH NEXT 100 ROWS ONLY`); 
            //const data_tt = await connection.execute(`SELECT * FROM USERS_DELETED`); 
            const log_table = data_t.rows; 
            //const user_deleted_table= data_tt.rows; 
    
            res.render('fpt', {log_table, page_index: 1}); 
        } catch (error) { 
            console.log(error); 
        } 
    }
});
app.get('/fpt2', async(req, res) => {
    try{
        console.log(req.query.page_index);
        const connection = await oracledb.getConnection(dbConfig);
        const data_t = await connection.execute(`SELECT * FROM FPT_LOG ORDER BY TIME DESC OFFSET ${Number(req.query.page_index)*100} ROWS FETCH NEXT 100 ROWS ONLY`);
        const log_table = data_t.rows;
        res.render('fpt', {log_table, page_index: Number(req.query.page_index)+1});
    } catch (error) {
        console.log(error);
    }
});
app.get('/user_deleted', async(req, res) => {
    try{
        const connection = await oracledb.getConnection(dbConfig);
        const data_tt = await connection.execute(`SELECT * FROM USERS_DELETED`);
        const user_deleted_table= data_tt.rows;
        res.render('user_deleted', {user_deleted_table, page_index: 1});
    } catch (error) {
        console.log(error);
    }
});


app.get('/home', async (req, res) => {
    try{
        const connection = await oracledb.getConnection(dbConfig);
        const nsfw_stats = (loggedin.length === 0)? `'NO'` : `USER_NSFW_STATUS(${loggedin[0][0]})`;
        const trending_anime_t = await connection.execute(`SELECT ANIME_ID, TITLE_ENGLISH, TITLE_NATIVE, COVER_IMAGE, ISADULT FROM ANIME WHERE ISADULT LIKE ${nsfw_stats} ORDER BY VISIT_COUNT DESC FETCH FIRST 5 ROWS ONLY`);
        const trending_anime = trending_anime_t.rows;
        const trending_manga_t = await connection.execute(`SELECT MANGA_ID, TITLE_ENGLISH, TITLE_NATIVE, COVER_IMAGE, ISADULT FROM MANGA WHERE ISADULT LIKE ${nsfw_stats} ORDER BY VISIT_COUNT DESC FETCH FIRST 5 ROWS ONLY`);
        const trending_manga = trending_manga_t.rows;
        const top_anime_t = await connection.execute(`SELECT ANIME_ID, TITLE_ENGLISH, TITLE_NATIVE, COVER_IMAGE, ISADULT FROM ANIME ORDER BY GET_ANIME_AVG_RATING(ANIME_ID) DESC FETCH FIRST 5 ROWS ONLY`);
        const top_manga_t = await connection.execute(`SELECT MANGA_ID, TITLE_ENGLISH, TITLE_NATIVE, COVER_IMAGE, ISADULT FROM MANGA ORDER BY GET_MANGA_AVG_RATING(MANGA_ID) DESC FETCH FIRST 5 ROWS ONLY`);
        var recommended_anime;
        if(loggedin.length !==0 ){
            const recommended_anime_t = await connection.execute(`SELECT ANIME_ID, TITLE_ENGLISH, TITLE_NATIVE, COVER_IMAGE
            FROM ANIME WHERE ISADULT LIKE ${nsfw_stats}
            ORDER BY SHOULD_RECOMMEND_THIS_ANIME(ANIME_ID, ${loggedin[0][0]}) DESC FETCH FIRST 5 ROWS ONLY`);
            recommended_anime = recommended_anime_t.rows;
            const logger = await connection.execute(`CALL FPT_LOG_INSERT(${loggedin[0][0]}, 'FUNCTION', 'SHOULD_RECOMMEND_THIS_ANIME', 'HOME', '${loggedin[0][0]}')`);
            console.log(recommended_anime);
        }
        if(loggedin.length !==0 ){
            //const logger = await connection.execute(`INSERT INTO SEARCH_HISTORY (USER_ID, SEARCH_TERM) VALUES (${loggedin[0][0]}, '${req.query.title}')`);
            const logger = await connection.execute(`CALL FPT_LOG_INSERT(${loggedin[0][0]}, 'FUNCTION', 'GET_ANIME_AVG_RATING', 'TOP_ANIME', '*')`);
            const logger2 = await connection.execute(`CALL FPT_LOG_INSERT(${loggedin[0][0]}, 'FUNCTION', 'GET_MANGA_AVG_RATING', 'TOP_MANGA', '*')`);
            const logger3 = await connection.execute(`CALL FPT_LOG_INSERT(${loggedin[0][0]}, 'FUNCTION', 'USER_NSFW_STATUS', 'TRENDING_FILTER', '${loggedin[0][0]}')`);
        } else {
            const logger = await connection.execute(`CALL FPT_LOG_INSERT(NULL, 'FUNCTION', 'GET_ANIME_AVG_RATING', 'TOP_ANIME', '*')`);
            const logger2 = await connection.execute(`CALL FPT_LOG_INSERT(NULL, 'FUNCTION', 'GET_MANGA_AVG_RATING', 'TOP_MANGA', '*')`);
        }   
        await connection.close();
        res.render('home', { trending_anime, trending_manga, top_anime: top_anime_t.rows, top_manga: top_manga_t.rows, recommended_anime });
    } catch (error) {
        console.log(error);
    }
});


// Routes

app.get('/', async (req, res) => {
    try {
        const connection = await oracledb.getConnection(dbConfig);
        const year_t = await connection.execute(`SELECT EXTRACT(YEAR FROM START_DATE) AS START_YEAR 
            FROM ANIME GROUP BY EXTRACT(YEAR FROM START_DATE) ORDER BY EXTRACT(YEAR FROM START_DATE) DESC`);
        const year = year_t.rows;

        const country_of_origin_t = await connection.execute(`SELECT COUNTRY_OF_ORIGIN FROM ANIME GROUP BY COUNTRY_OF_ORIGIN ORDER BY COUNTRY_OF_ORIGIN`);
        const country_of_origin = country_of_origin_t.rows;
        const nsfw_stat = (loggedin.length === 0)? `'NO'` : `USER_NSFW_STATUS(${loggedin[0][0]})`;
        const result = await connection.execute(`SELECT ANIME_ID, TITLE_ENGLISH, TITLE_NATIVE, COVER_IMAGE, ISADULT FROM ANIME WHERE ISADULT LIKE ` +nsfw_stat+  `ORDER BY VISIT_COUNT DESC FETCH FIRST 50 ROWS ONLY`);
        if(loggedin.length !==0 ){
            const logger = await connection.execute(`CALL FPT_LOG_INSERT(${loggedin[0][0]}, 'FUNCTION', 'USER_NSFW_STATUS', 'HOME', '${loggedin[0][0]}')`);
        }
        const data = result.rows;
        await connection.close();
        //console.log(loggedin)
        //console.log(data)
        //console.log(data.length)
        res.render('index', { data, year, country_of_origin, page_index: 0 });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/user/:user_id', async (req, res) => { //edited to add reviews, also the ejs //nsfw status check added
    try{
        const connection = await oracledb.getConnection(dbConfig);
        console.log('procedure test')
        //const result2 = await connection.execute(`CALL TEST_P(${req.params.user_id})`);
        const result = await connection.execute(`SELECT NSFW FROM USERS WHERE USER_ID = ${req.params.user_id}`);
        const nsfw_status = result.rows[0][0];
        await connection.close();
        if(nsfw_status === 1 && loggedin.length === 0){
            res.send(`
                <script>
                    alert('You need to log in to view this profile.');
                    window.location.href = '/login';
                </script>
            `);
        } else if (nsfw_status === 'YES' && loggedin.length != 0 ){
            const connection = await oracledb.getConnection(dbConfig);
            const result = await connection.execute(`SELECT PRIVILEGE,NSFW FROM USERS WHERE USER_ID = ${loggedin[0][0]}`);
            const nsfw_status = result.rows[0][1];
            const privilege = result.rows[0][0];
            await connection.close();
            if(nsfw_status !== 1 && privilege !== 'Admin') {
                res.send(`
                    <script>
                        alert('You are not allowed to view this profile.');
                        window.location.href = '/login';
                    </script>
                `);
            }
        }
    } catch (error) {
        console.log(error);
    }
    try {
        const connection = await oracledb.getConnection(dbConfig);
        console.log(req.params.user_id);
        console.log(Number(req.params.user_id));
        const result = await connection.execute(`SELECT * FROM USERS WHERE USER_ID = ${req.params.user_id}`);
        const data = result.rows;
        console.log(data);
        if(data.length != 1) 
            res.redirect('/');

        console.log(loggedin)
        const r_points_t = await connection.execute(`SELECT REPUTATION_POINTS(USER_ID) FROM USERS WHERE USER_ID = ${req.params.user_id}`); //function might have some logical issues
        if(loggedin.length !==0 ){
            //const logger = await connection.execute(`INSERT INTO SEARCH_HISTORY (USER_ID, SEARCH_TERM) VALUES (${loggedin[0][0]}, '${req.query.title}')`);
            const logger = await connection.execute(`CALL FPT_LOG_INSERT(${loggedin[0][0]}, 'FUNCTION', 'REPUTATION_POINTS', 'USER_PROFILE', '${req.params.user_id}')`);
        } else {
            const logger = await connection.execute(`CALL FPT_LOG_INSERT(NULL, 'FUNCTION', 'REPUTATION_POINTS', 'USER_PROFILE', '${req.params.user_id}')`);
        } 
        const r_points = r_points_t.rows[0][0];
        console.log(r_points);
        const anime_list_t = await connection.execute(`
        SELECT A.TITLE_ENGLISH, A.TITLE_NATIVE, A.COVER_IMAGE, UAL.STATUS, A.ANIME_ID FROM USERS U JOIN USER_ANIME_LIST UAL ON U.USER_ID = UAL.USER_ID JOIN ANIME A ON UAL.ANIME_ID = A.ANIME_ID WHERE UAL.USER_ID = :user_id`, {user_id: `${req.params.user_id}`});
        const anime_list = anime_list_t.rows;
        const manga_list_t = await connection.execute(`
        SELECT A.TITLE_ENGLISH, A.TITLE_NATIVE, A.COVER_IMAGE, UAL.STATUS, A.MANGA_ID FROM USERS U JOIN USER_MANGA_LIST UAL ON U.USER_ID = UAL.USER_ID JOIN MANGA A ON UAL.MANGA_ID = A.MANGA_ID WHERE UAL.USER_ID = :user_id`, {user_id: `${req.params.user_id}`});
        const manga_list = manga_list_t.rows;
        const anime_review_t = await connection.execute(`SELECT UAR.REVIEW_ID, UAR.ANIME_ID, UAR.USER_ID, UAR.SCORE, UAR.VOTES, DBMS_LOB.SUBSTR(UAR.SUMMARY, 4000, 1) AS SUMMARY,
                                                        UAR.REVIEW,
                                                        UAR.TIME, A.TITLE_ENGLISH, A.TITLE_NATIVE, A.COVER_IMAGE
                                                        FROM USER_ANIME_REVIEWS UAR JOIN ANIME A ON UAR.ANIME_ID = A.ANIME_ID WHERE USER_ID = :user_id`, {user_id: `${req.params.user_id}`});
        const anime_review = anime_review_t.rows;
        const manga_review_t = await connection.execute(`SELECT UMR.REVIEW_ID, UMR.MANGA_ID, UMR.USER_ID, UMR.SCORE, UMR.VOTES, UMR.SUMMARY, UMR.REVIEW, UMR.TIME,
            M.TITLE_ENGLISH, M.TITLE_NATIVE, M.COVER_IMAGE FROM USER_MANGA_REVIEWS UMR JOIN MANGA M ON UMR.MANGA_ID = M.MANGA_ID WHERE UMR.USER_ID = :user_id`, {user_id: `${req.params.user_id}`});
        const manga_review = manga_review_t.rows;
        await connection.close();
        //console.log(data)
        res.render('user', { data, anime_list, manga_list, anime_review, manga_review, r_points });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/user/:user_id/anime/:list_id', async (req, res) => {
                            //list_id 1 hole watchlist show korbe, 2 hole watching, 3 completed
    try {
        const connection = await oracledb.getConnection(dbConfig);
        console.log(req.params.user_id);
        const result = await connection.execute(`SELECT ANIME_ID, TITLE_ENGLISH, TITLE_NATIVE, COVER_IMAGE FROM ANIME WHERE ANIME_ID IN (SELECT ANIME_ID FROM USER_ANIME_LIST WHERE USER_ID = ${req.params.user_id} AND STATUS = ${req.params.list_id})`);
        const data = result.rows;
        res.render('anime_list', { data });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Internal Server Error');
    }
});
app.get('/user/:user_id/manga/:list_id', async (req, res) => {
                            //list_id 1 hole watchlist show korbe, 2 hole reading, 3 completed
    try {
        const connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(`SELECT MANGA_ID, TITLE_ENGLISH, TITLE_NATIVE, COVER_IMAGE FROM MANGA WHERE MANGA_ID IN (SELECT MANGA_ID FROM USER_MANGA_LIST WHERE USER_ID = ${req.params.user_id} AND STATUS = ${req.params.list_id})`);
        const data = result.rows;
        res.render('anime_list', { data });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Internal Server Error');
    }
});
app.get('/promote/:user_id', async (req, res) => {
    if(loggedin.length === 0){
        res.redirect('/login');
    } else if(loggedin[0][3] !== 'Admin'){
        res.redirect('/');
    }
    try {
        const connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(`UPDATE USERS SET PRIVILEGE = 'Moderator' WHERE USER_ID = ${req.params.user_id}`);
        await connection.commit();
        await connection.close();
        res.redirect('/user/'+req.params.user_id);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Internal Server Error');
    }
});
app.get('/demote/:user_id', async (req, res) => {
    if(loggedin.length === 0){
        res.redirect('/login');
    } else if(loggedin[0][3] !== 'Admin'){
        res.redirect('/');
    }
    try {
        const connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(`UPDATE USERS SET PRIVILEGE = 'User' WHERE USER_ID = ${req.params.user_id}`);
        await connection.commit();
        await connection.close();
        res.redirect('/user/'+req.params.user_id);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/ban/:user_id', async (req, res) => {
    if(loggedin.length === 0){
        res.redirect('/login');
    } else if(loggedin[0][3] !== 'Admin' || loggedin[0][3] !== 'Moderator'){
        res.redirect('/');
    } else {
        try {
            const connection = await oracledb.getConnection(dbConfig);
            const result = await connection.execute(`UPDATE USERS SET ACCOUNT_STATUS = 4 WHERE USER_ID = ${req.params.user_id}`);
            await connection.commit();
            await connection.close();
            res.redirect('/user/'+req.params.user_id);
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Internal Server Error');
        }
    }
});
app.get('/unban/:user_id', async (req, res) => {
    if(loggedin.length === 0){
        res.redirect('/login');
    } else if(loggedin[0][3] !== 'Admin' || loggedin[0][3] !== 'Moderator'){
        res.redirect('/');
    }
    try {
        const connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(`UPDATE USERS SET ACCOUNT_STATUS = 1 WHERE USER_ID = ${req.params.user_id}`);
        await connection.commit();
        await connection.close();
        res.redirect('/user/'+req.params.user_id);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/logout', (req, res) => {
    const index = loggedin.indexOf(loggedin[0]);
    loggedin.splice(index, 1);
    login_status = false;
    res.send(`
        <script>
            alert('Logged out successfully.');
            window.location.href = '/';
        </script>
    `)
});

app.post('/login', async (req, res) => {
    async function run() {
        const connection = await oracledb.getConnection(dbConfig);
        var query = `SELECT * FROM USERS WHERE USERNAME = :username AND PASSWORD = ORA_HASH(:password)`;
        const result = await connection.execute(query, {username: `${req.body.username}`, password: `${req.body.password}`});
        console.log(result.rowsAffected);
        
        await connection.close();
        //console.log(req.body.username);
        //console.log(req.body.password);
        //console.log(result.rows[0][0]);

        if (result.rows.length == 1 && Number(result.rows[0][8
        ]) == 1) {
            loggedin.push(result.rows[0]);
            res.redirect('/home');
        } else {
            // Send a response with a script to display an alert
            res.send(`
                <script>
                    alert('Incorrect credentials. Please try again.');
                    window.location.href = '/login'; // Redirect to the login page
                </script>
            `);
        }
    }
    run();
});
app.post('/register', async (req, res) =>{
    async function run()
    {
        try{
            const connection = await oracledb.getConnection(dbConfig);
            var query = `INSERT INTO USERS (USER_ID, PASSWORD, USERNAME, EMAIL, PROFILE_PICTURE, PRIVILEGE, REPUTATION, NSFW, ACCOUNT_STATUS) VALUES
                        (USER_ID_SEQ.NEXTVAL, ORA_HASH(:password), :username, null, null, :privilege, 0, 0, 1)`;
            const result = await connection.execute(query, {username: `${req.body.username}`, password: `${req.body.password}`, privilege: "USER"});
            await connection.commit();
            await connection.close();
            // console.log(req.body.username);
            // console.log(req.body.password);
            // console.log(req.body.profile_picture);
            // console.log(result);
        } catch (error) {
            console.log(error);
            res.send(`<script>
                alert('${error.message}');
                window.location.href = '/register'; // Redirect to the register page
            </script>`);
        }
    }
    run();
    res.redirect('/');
})


app.get('/search', async (req, res) => {
   
    console.log(req.query.title.toLowerCase());
    // console.log('Search term post:', searchAnime);
    // const searchLower = searchAnime.toLowerCase();
    try {
        const connection = await oracledb.getConnection(dbConfig);
        const year_t = await connection.execute(`SELECT EXTRACT(YEAR FROM START_DATE) AS START_YEAR 
            FROM ANIME GROUP BY EXTRACT(YEAR FROM START_DATE) ORDER BY EXTRACT(YEAR FROM START_DATE) DESC`);
        const year = year_t.rows;

        const country_of_origin_t = await connection.execute(`SELECT COUNTRY_OF_ORIGIN FROM ANIME GROUP BY COUNTRY_OF_ORIGIN ORDER BY COUNTRY_OF_ORIGIN`);
        const country_of_origin = country_of_origin_t.rows;

        // const result = await connection.execute(`SELECT ANIME_ID, TITLE_ENGLISH, TITLE_NATIVE, COVER_IMAGE FROM ANIME
        //  WHERE LOWER(TITLE_ENGLISH) LIKE '%${searchLower}%' OR LOWER(TITLE_NATIVE) LIKE '%${searchLower}%'`);
        // const data = result.rows;
        //console.log(req.query.title, req.query.year, req.query.country, req.query.genre, req.query.characters, req.query.studio.toLowerCase())
        console.log(req.query.page_index)
        const year_query = (req.query.year != 0) ? `AND (EXTRACT(YEAR FROM A.START_DATE) <= ${Number(req.query.year)}
        AND (EXTRACT(YEAR FROM A.END_DATE) >= ${Number(req.query.year)} OR A.END_DATE IS NULL))` : ``;

        const manga_adapted_query = (req.query.manga_adapted == 'on') ? `AND A.ANIME_ID IN (SELECT ANIME_ID FROM ANIME_X_MANGA)` : '';
        const studio_query = (req.query.studio != '') ? `AND (LOWER(S.NAME) LIKE '%${req.query.studio.toLowerCase()}%')` : '';
        const character_query = (req.query.characters != '') ? `AND (LOWER(C.FIRST_NAME || ' ' || C.LAST_NAME) LIKE '%${req.query.characters.toLowerCase()}%')` : '';
        const nsfw_stat = (loggedin.length === 0)? `'NO'` : `USER_NSFW_STATUS(${loggedin[0][0]})`;
        const country_query = (req.query.country != '') ? `AND A.COUNTRY_OF_ORIGIN LIKE '%${req.query.country}%'` : '';
        const status_query = (req.query.status != '') ? `AND A.STATUS LIKE '%${req.query.status.toUpperCase()}%'` : '';
        const genre_query = (req.query.genre != '') ? `AND (LOWER(AG.TYPE_NAME) LIKE '%${req.query.genre.toLowerCase()}%')` : '';
        const search_t = await connection.execute(
            `
            WITH A_S AS
            (SELECT * FROM ANIME A WHERE ( (LOWER(A.TITLE_ENGLISH) LIKE '%' || :title || '%') OR EDIT_DISTANCE_MAIN(LOWER(A.TITLE_ENGLISH), '${req.query.title.toLowerCase()}') <= 2)`
                                                                    +country_query + status_query
                                                                    + year_query + `
            )
            SELECT A.ANIME_ID, A.TITLE_ENGLISH, A.TITLE_NATIVE, A.COVER_IMAGE, A.ISADULT
                FROM A_S A FULL JOIN ANIME_X_GENRE AXG ON A.ANIME_ID = AXG.ANIME_ID
                        FULL JOIN CHARACTERS_X_ANIME CXA ON CXA.ANIME_ID = A.ANIME_ID 
						FULL JOIN CHARACTERS C ON CXA.CHARACTER_UID = C.CHARACTER_UID
                        FULL JOIN ANIME_GENRE AG ON AG.GENRE_UID = AXG.GENRE_UID
                        FULL JOIN ANIME_X_MANGA AXM ON AXM.ANIME_ID = A.ANIME_ID
                        FULL JOIN STUDIO_X_ANIME SXA ON SXA.ANIME_ID = A.ANIME_ID
                        FULL JOIN STUDIO S ON S.STUDIO_UID = SXA.STUDIO_UID
                WHERE ISADULT LIKE `+nsfw_stat+`
                ` + genre_query
                + manga_adapted_query + studio_query + character_query +
            `GROUP BY A.ANIME_ID, A.TITLE_ENGLISH, A.TITLE_NATIVE, A.COVER_IMAGE, A.ISADULT
            OFFSET ${Number(req.query.page_index)*50} ROWS FETCH NEXT 50 ROWS ONLY
            `,
            {
                title: req.query.title.toLowerCase()
            }
        );
        if(loggedin.length !==0 ){
            //const logger = await connection.execute(`INSERT INTO SEARCH_HISTORY (USER_ID, SEARCH_TERM) VALUES (${loggedin[0][0]}, '${req.query.title}')`);
            const logger = await connection.execute(`CALL FPT_LOG_INSERT(${loggedin[0][0]}, 'FUNCTION', 'EDIT_DISTANCE_MAIN', 'SEARCH_ANIME', '${req.query.title}')`);
            const logger2 = await connection.execute(`CALL FPT_LOG_INSERT(${loggedin[0][0]}, 'FUNCTION', 'USER_NSFW_STATUS', 'SEARCH_FILTER', '${loggedin[0][0]}')`);
        } else {
            const logger = await connection.execute(`CALL FPT_LOG_INSERT(NULL, 'FUNCTION', 'EDIT_DISTANCE_MAIN', 'SEARCH_ANIME', '${req.query.title}')`);
        }
        const data = search_t.rows;
        //console.log(data)
        // const anime_complex = search_t.rows;
        // //console.log(anime_complex[0])
        // console.log(req.query.title, req.query.year, req.query.country, req.query.genre, req.query.characters, req.query.studio, req.query.staff)
        console.log(req.query.manga_adapted);
        await connection.close();
        res.render('search', {data, year, country_of_origin, page_index: Number(req.query.page_index)+1, title: req.query.title, year_s: req.query.year, 
            country_s: req.query.country, status_s: req.query.status, manga_adapted_s: req.query.manga_adapted, genre_s: req.query.genre,
            characters_s: req.query.characters, studio_s: req.query.studio});
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Internal Server Error');
    }
  
});

app.get("/login", async (req, res)=>{
    console.log('request received');
    if(loggedin.length == 0){
        res.render('login')
    } else {
        const connection = await oracledb.getConnection(dbConfig);
        const username_t = await connection.execute(`SELECT USERNAME FROM USERS WHERE USER_ID = ${loggedin[0][0]}`);
        const username = username_t.rows;
        console.log(username[0][0]);
        await connection.close();
        res.send(`
            <script>
                alert('Already logged in as ${username}. Please log out first.');
                window.location.href = '/';
            </script>
        `);
    }
    //console.log(req);
})

app.get("/logout", async (req, res)=>{
    if(loggedin.length != 0){
        loggedin = [];
        res.send(`
            <script>
                alert('Logged out successfully.');
                window.location.href = '/';
            </script>
        `)
    } else {
        res.send(`
            <script>
                alert('You are not logged in.');
                window.location.href = '/';
            </script>
        `);
    }
});

app.get("/register", (req, res)=>{
    res.render('register');
})

app.get("/admin", async (req, res)=>{
    console.log(loggedin.length);
    if(loggedin.length == 0){
        res.redirect('/');
    }
    
    try {
        const connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(`SELECT * FROM ANIME ORDER BY anime_id FETCH FIRST 50 ROWS ONLY`);
        const data = result.rows;
        await connection.close();
        console.log(loggedin)
        if(Number(loggedin[0][0]) === 3010 || Number(loggedin[0][0]) === 3002){
            res.render('admin_anime', { data });
        } else {
            res.redirect('/');
        }
        //console.log(data)
        //console.log(data.length)
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Internal Server Error');
    }
    
});
app.post("/admin", async (req, res) => {
    
    async function run() {
        
        console.log(req.body.average_episode_length)

        try {
            const connection = await oracledb.getConnection(dbConfig);
            const start_date_split = req.body.start_date.split(" ")
            const end_date_split = req.body.end_date.split(" ")

            const result = await connection.execute(`
                UPDATE ANIME
                SET TITLE_ENGLISH = :title_english,
                    TITLE_NATIVE = :title_native,
                    ISADULT = :is_adult,
                    EPISODE_COUNT = :episode_count,
                    STATUS = :status,
                    START_DATE = TO_DATE(:start_date, 'YYYY-MM-DD'),
                    END_DATE = TO_DATE(:end_date, 'YYYY-MM-DD'),
                    SYNOPSIS = :synopsis,
                    COUNTRY_OF_ORIGIN = :country_of_origin,
                    AVERAGE_EPISODE_DURATION = :average_episode_length,
                    BANNER_IMAGE = :banner_image,
                    COVER_IMAGE = :cover_image
                WHERE ANIME_ID = :anime_id
            `, {
                title_english: req.body.title_english,
                title_native: req.body.title_native,
                is_adult: req.body.is_adult,
                episode_count: req.body.episode_count,
                status: req.body.status,
                start_date: (start_date_split[1] !=null || start_date_split[2]!=null || start_date_split[3] != null )? start_date_split[3]+"-"+start_date_split[1]+"-"+start_date_split[2]
                :'',
                end_date:  (end_date_split[1] !=null || end_date_split[2]!=null || end_date_split[3] != null )? end_date_split[3]+"-"+end_date_split[1]+"-"+end_date_split[2]
                :'',
                synopsis: req.body.synopsis,
                country_of_origin: req.body.country_of_origin,
                average_episode_length: Number(req.body.average_episode_length),
                banner_image: req.body.banner_image,
                cover_image: req.body.cover_image,
                anime_id: req.body.anime_id
            });
            
            await connection.commit(); //to commit
            await connection.close();
            console.log(result);
            res.redirect('/admin');
        } catch (error) {
            console.log(error);
        }
    }

    run();
});

app.post("/anime/:anime_id/delete", async (req, res) => {
    async function run() {
        console.log('delete works?')        
        try{
            const connection = await oracledb.getConnection(dbConfig);
            const result = await connection.execute(`DELETE FROM ANIME WHERE ANIME_ID = ${req.body.anime_id}`);
            console.log(result);
            await connection.commit();
            await connection.close();
        } catch (error) {
            console.log(error);
        }
    }
    run();
    res.redirect('/'); //redirect to anime page, not main page
});
app.get("/manga/:manga_id/delete_link/:anime_id", async(req, res) => {
    async function run() {
        try {
            console.log('came here')
            const connection = await oracledb.getConnection(dbConfig);
            const result = await connection.execute (`DELETE FROM ANIME_X_MANGA WHERE MANGA_ID = ${req.params.manga_id} AND ANIME_ID = ${req.params.anime_id}`);
            await connection.commit();
            await connection.close();
            res.redirect(`/anime/${req.params.anime_id}/edit`);
        } catch (error) {
            console.log(error);
        }
    }
    run();
});

app.post("/manga/:manga_id/delete", async (req, res) => {
    async function run() {
        console.log('delete works?')
        try{
            const connection = await oracledb.getConnection(dbConfig);
            const result = await connection.execute(`DELETE FROM MANGA WHERE MANGA_ID = ${req.body.manga_id}`);
            await connection.commit();
            await connection.close();
        } catch (error) {
            console.log(error);
        }

    }
    run();
    res.redirect('/manga/');
});


app.get("/admin/add/anime", async (req, res)=>{
    
    // if(loggedin.length == 0){
    //     res.redirect('/');
    // } else if((loggedin[0][3]) === 'Admin' || (loggedin[0][3]) === 'Moderator'){
        const connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(`SELECT * FROM ANIME_GENRE`);
        const genres = result.rows;
        //console.log(genres)
        res.render('admin_anime_add', {genres});
    // } else {
    //     res.redirect('/');
    // }
    
});

var cpUpload = upload.fields([{ name: 'banner_image', maxCount: 1 }, { name: 'cover_image', maxCount: 1 }, { name: 'image_link[]', maxCount: 1000 }])
app.post("/admin/add/anime", cpUpload, async (req, res) => { //MIGHT NEED AN ANIME SEQUENCE
    async function run() {
        console.log(req.files['image_link[]'])
        //console.log(req.body.anime_id, req.body.title_english, req.body.title_native, req.body.is_adult, req.body.episode_count, req.body.status, req.body.start_date, req.body.end_date, req.body.synopsis, req.body.country_of_origin, req.body.average_episode_length, req.body.banner_image, req.body.cover_image)
        try{
            const connection = await oracledb.getConnection(dbConfig);
            const result = await connection.execute(`
                INSERT INTO ANIME (ANIME_ID, TITLE_ENGLISH, TITLE_NATIVE, ISADULT, EPISODE_COUNT, STATUS, START_DATE, END_DATE, SYNOPSIS, COUNTRY_OF_ORIGIN, AVERAGE_EPISODE_DURATION, BANNER_IMAGE, COVER_IMAGE)
                VALUES (ANIME_ID_SEQ.NEXTVAL, :title_english, :title_native, :is_adult, :episode_count, :status, TO_DATE(:start_date, 'YYYY-MM-DD'), TO_DATE(:end_date, 'YYYY-MM-DD'), :synopsis, :country_of_origin, :average_episode_duration, :banner_image, :cover_image)
            `, {
                title_english: req.body.title_english,
                title_native: req.body.title_native,
                is_adult: req.body.is_adult,
                episode_count: Number(req.body.episode_count),
                status: req.body.status,
                start_date: req.body.start_date,
                end_date: req.body.end_date,
                synopsis: req.body.synopsis,
                country_of_origin: req.body.country_of_origin,
                average_episode_duration: Number(req.body.average_episode_duration),
                banner_image:(req.files['banner_image'] == null)? '': 'http://localhost:3000/'+req.files['banner_image'][0].path.substring(7),
                cover_image:(req.files['cover_image'] == null)? '': 'http://localhost:3000/'+req.files['cover_image'][0].path.substring(7)
            });
            if(req.body.first_name !== undefined) {
                for (let i = 0; i < req.body.first_name.length; i++) {
                    const result = await connection.execute(`INSERT INTO CHARACTERS (CHARACTER_UID, FIRST_NAME, LAST_NAME, ROLE_PLAY, IMAGE_LINK) 
                    VALUES (CHARACTER_ID_SEQ.NEXTVAL, :first_name, :last_name, :role_play, :image_link)`, 
                    {first_name: `${req.body.first_name[i]}`, last_name: `${req.body.last_name[i]}`, role_play: `${req.body.role_play[i]}`, image_link: `${'http://localhost:3000/'+req.files['image_link[]'][i].path.substring(7)}`});
                    const result2 = await connection.execute(`INSERT INTO CHARACTERS_X_ANIME (CHARACTER_UID, ANIME_ID) VALUES (CHARACTER_ID_SEQ.CURRVAL, ANIME_ID_SEQ.CURRVAL)`);
                }
            }
            if(req.body.genre !== undefined) {
                for(let i=0; i< req.body.genre.length; i++){
                    const result = await connection.execute(`INSERT INTO ANIME_X_GENRE (ANIME_ID, GENRE_UID) VALUES (ANIME_ID_SEQ.CURRVAL, :genre)`, {genre: `${req.body.genre[i]}`});
                }
            }
            await connection.commit();
            await connection.close();
            res.redirect('/admin/add/anime');
        } catch (error) {
            console.log(error);
            function escapeHtml(unsafe) {
                return unsafe
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;")
                    .replace(/'/g, "&#039;");
            }
            var error_message = error.message;
            // Sanitize the error message to prevent XSS attacks
            var sanitized_error_message = escapeHtml(error_message);
            // Redirect to the homepage with an error query parameter
            res.send(encodeURIComponent(sanitized_error_message));
        }
        
        // Function to escape HTML characters to prevent XSS attacks
    }
    run();
});

app.get("/anime/:anime_id", async (req, res)=>{ //render person to ui!
    try {
        const connection = await oracledb.getConnection(dbConfig);
        const visit_count_inc = await connection.execute(`UPDATE ANIME SET VISIT_COUNT = VISIT_COUNT + 1 WHERE ANIME_ID = ${req.params.anime_id}`);
        await connection.commit();
        const result = await connection.execute(`SELECT * FROM ANIME WHERE ANIME_ID = ${req.params.anime_id}`);
        const adapted_manga_ids = await connection.execute(`SELECT * FROM ANIME_X_MANGA WHERE ANIME_ID = ${req.params.anime_id}`);
        const adapted_manga_infos = [];
        for (let i = 0; i < adapted_manga_ids.rows.length; i++) {
            const adapted_manga_info = await connection.execute(`SELECT * FROM MANGA WHERE MANGA_ID = ${adapted_manga_ids.rows[i][1]}`);
            adapted_manga_infos.push(adapted_manga_info.rows[0]);
        }
        const anime_characters_t = await connection.execute(`SELECT C.* FROM CHARACTERS C JOIN CHARACTERS_X_ANIME CXA ON C.CHARACTER_UID = CXA.CHARACTER_UID WHERE CXA.ANIME_ID = ${req.params.anime_id} ORDER BY C.CHARACTER_UID FETCH FIRST 20 ROWS ONLY` );
        const characters = anime_characters_t.rows;
        const data = result.rows;
        const voice_actors_t = await connection.execute(`SELECT P.NAME, P.PERSON_UID, P.IMAGE_LINK FROM PERSON P JOIN VOICE_ARTIST VA ON P.PERSON_UID = VA.PERSON_UID JOIN CHARACTERS_X_ANIME CXA ON VA.CHARACTER_UID = CXA.CHARACTER_UID WHERE CXA.ANIME_ID = ${req.params.anime_id}`);
        const voice_actors = voice_actors_t.rows;
        const studios_t = await connection.execute(`SELECT S.STUDIO_UID, S.NAME, S.IMAGE_LINK FROM STUDIO S JOIN STUDIO_X_ANIME SXA ON S.STUDIO_UID = SXA.STUDIO_UID WHERE SXA.ANIME_ID = :anime_id 
        GROUP BY S.STUDIO_UID, S.NAME, S.IMAGE_LINK`, {anime_id: `${req.params.anime_id}`});
        const person_t = await connection.execute(`SELECT P.PERSON_UID, P.NAME, P.IMAGE_LINK FROM PERSON P WHERE P.PERSON_UID IN
                                                    (
                                                        SELECT PERSON_UID FROM STAFF_X_ANIME WHERE ANIME_ID = :anime_id
                                                    )`, {anime_id: `${req.params.anime_id}`});     
                                                    
        const genre = await connection.execute(`SELECT AG.TYPE_NAME, AG.GENRE_UID FROM ANIME_GENRE AG JOIN ANIME_X_GENRE AXG ON AG.GENRE_UID = AXG.GENRE_UID WHERE AXG.ANIME_ID = ${req.params.anime_id}`);
        if(data.length != 1) 
            res.redirect('/');
        // adapted_manga_infos.forEach((manga) => {
        //     console.log(manga[0]);
        // });
        // console.log(loggedin);
        var user_anime_status = 0;
        var user_rating = 0;
        var edit_access = false;
        if(loggedin.length != 0){
            const user_anime_status_t = await connection.execute(`SELECT STATUS, USER_ID FROM USER_ANIME_LIST WHERE USER_ID = ${loggedin[0][0]} AND ANIME_ID = ${req.params.anime_id}`);
            const user_rating_t = await connection.execute(`SELECT SCORE FROM USER_ANIME_REVIEWS WHERE USER_ID = ${loggedin[0][0]} AND ANIME_ID = ${req.params.anime_id}`);
            // console.log('printing what i need')
            // console.log(user_anime_status_t.rows.length);
            if(user_anime_status_t.rows.length === 0){
                user_anime_status = 0;
            } else {
                user_anime_status = user_anime_status_t.rows[0][0];
            }
            if(Number(loggedin[0][0]) === 3010 || Number(loggedin[0][0]) === 3002){
                edit_access = true;
            }
            if(user_rating_t.rows.length === 0){
                user_rating = 0;
            } else {
                user_rating = user_rating_t.rows[0][0];
            }
        } else {
            user_anime_status = 0;
        }
        const user_reviews_t = await connection.execute(`SELECT REVIEW_ID, ANIME_ID, USER_ID, SCORE, GET_ANIME_REVIEW_VOTES(REVIEW_ID) V, DBMS_LOB.SUBSTR(SUMMARY, 4000, 1) AS SUMMARY,
                                                        REVIEW,
                                                        TIME, RETURN_USERNAME(USER_ID)
                                                        FROM USER_ANIME_REVIEWS WHERE ANIME_ID = :anime_id
                                                        ORDER BY V DESC`, {anime_id: `${req.params.anime_id}`}); //I MIGHT ADD OPTION TO ORDER BY DIFFERENT PARAMS
        const user_reviews = user_reviews_t.rows;
        
        if(loggedin.length !==0 ){
            //const logger = await connection.execute(`INSERT INTO SEARCH_HISTORY (USER_ID, SEARCH_TERM) VALUES (${loggedin[0][0]}, '${req.query.title}')`);
            const logger = await connection.execute(`CALL FPT_LOG_INSERT(${loggedin[0][0]}, 'FUNCTION', 'GET_ANIME_REVIEW_VOTES', 'SELECT_REVIEW', '*')`);
            const logger2 = await connection.execute(`CALL FPT_LOG_INSERT(${loggedin[0][0]}, 'FUNCTION', 'RETURN_USERNAME', 'SELECT_REVIEW', '*')`);
        } else {
            const logger = await connection.execute(`CALL FPT_LOG_INSERT(NULL, 'FUNCTION', 'GET_ANIME_REVIEW_VOTES', 'SELECT_REVIEW', '*')`);
            const logger2 = await connection.execute(`CALL FPT_LOG_INSERT(NULL, 'FUNCTION', 'RETURN_USERNAME', 'SELECT_REVIEW', '*')`);
        }  
        const user_review_map = {};
        //REVIEW NEEDS TO BE SELECTED IN PARTS FROM CLOB
        //console.log(user_reviews[0][5]); //clobs need to be read with await as they tend to close themselves pretty fast
        // var i=0;
        for(let i=0; i<user_reviews.length; i++){ //keeping it in map after encoding it to string
            try{
                await user_reviews[i][6].forEach((review) => {
                    try{
                        user_review_map[user_reviews[i][0]] = review.toString();
                    } catch (error) {
                        console.log(error);
                    }
                });
            } catch (error) {
                console.log(error);
            }
        }
        
        const avg_score_t = await connection.execute(`SELECT ROUND(AVG(SCORE), 1),COUNT(*) FROM USER_ANIME_REVIEWS WHERE ANIME_ID = ${req.params.anime_id}`);
        const avg_score = avg_score_t.rows[0];
        const per_score_count_t = await connection.execute(`SELECT S.SCORE, COUNT(UAR.SCORE) AS SCORE_COUNT
                                                            FROM (
                                                                SELECT 1 AS SCORE FROM DUAL UNION ALL
                                                                SELECT 2 AS SCORE FROM DUAL UNION ALL
                                                                SELECT 3 AS SCORE FROM DUAL UNION ALL
                                                                SELECT 4 AS SCORE FROM DUAL UNION ALL
                                                                SELECT 5 AS SCORE FROM DUAL
                                                            ) s
                                                            LEFT JOIN USER_ANIME_REVIEWS UAR ON S.SCORE = UAR.SCORE AND UAR.ANIME_ID = :anime_id
                                                            GROUP BY S.SCORE
                                                            ORDER BY NVL(S.SCORE, 0) DESC
                                                            `, 
                                                            {
                                                                anime_id: `${req.params.anime_id}`
                                                            });
        const per_score_count = per_score_count_t.rows;

        // console.log(avg_score);
        // console.log(per_score_count);
        // await user_reviews[0][6].forEach((review) => {
        //     console.log(i++);
        //     console.log(review.toString());
        // });
        //console.log(data)
        //console.log(data.length)
        console.log(user_rating)
        await connection.close();
        res.render('anime_details', { data, adapted_manga_infos, characters, voice_actors, user_anime_status, 
                                    edit_access, user_reviews, user_review_map, avg_score, per_score_count, studios: studios_t.rows, staffs:person_t.rows
                                    , genres: genre.rows, user_rating});
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Internal Server Error');
    }
    
}); //not complete yet

app.post('/anime/:id', async (req, res) => { //add to list done
                                            //review section needs some rework, if the review exists for the user, show it in the box so that he can edit it
    async function run()
    {
        if(loggedin.length == 0){
            res.send(`
                <script>
                    alert('Please log in first.');
                    window.location.href = '/login';
                </script>
            `);
        }
        try {
            const connection = await oracledb.getConnection(dbConfig);
            var query = `INSERT INTO USER_ANIME_LIST (USER_ID, ANIME_ID, STATUS) VALUES (:user_id, :anime_id, :status)`;
            // console.log(req.body.anime_id);
            // console.log(req.body.watchlist_status);
            // console.log(loggedin[0][0]);
            if(req.body.watchlist_status !== undefined) {
                const existence = await connection.execute(`SELECT * FROM USER_ANIME_LIST WHERE USER_ID = ${loggedin[0][0]} AND ANIME_ID = ${req.body.anime_id}`);
                if(existence.rows.length === 0){
                    const result = await connection.execute(query, {user_id: `${loggedin[0][0]}`, anime_id: `${Number(req.body.anime_id)}`, status: `${Number(req.body.watchlist_status)}`});
                //console.log(req.body.anime_id);
                } else {
                    if(req.body.watchlist_status == 0){
                        const result = await connection.execute(`DELETE FROM USER_ANIME_LIST WHERE USER_ID = ${loggedin[0][0]} AND ANIME_ID = ${req.body.anime_id}`);
                    } else {
                        const result = await connection.execute(`UPDATE USER_ANIME_LIST SET STATUS = ${Number(req.body.watchlist_status)} WHERE USER_ID = ${loggedin[0][0]} AND ANIME_ID = ${req.body.anime_id}`);
                    }
                }
            } 
            else if (req.body.review !== undefined || req.body.summary !== undefined || req.body.review_rating !== undefined) { //not done yet
                const existence = await connection.execute(`SELECT * FROM USER_ANIME_REVIEWS WHERE USER_ID = ${loggedin[0][0]} AND ANIME_ID = ${req.body.anime_id}`);
                if(existence.rows.length === 0){
                    // var review = '';
                    // var summary = '';
                    // if(req.body.review !== undefined) review = req.body.review;
                    // if(req.body.summary !== undefined) summary = req.body.summary;
                    // console.log(review);
                    // console.log(summary);
                    const result = await connection.execute(`INSERT INTO USER_ANIME_REVIEWS (REVIEW_ID, ANIME_ID, USER_ID, SUMMARY, REVIEW, TIME, SCORE) VALUES 
                                                            (REVIEW_SEQ.NEXTVAL, ${req.body.anime_id}, ${loggedin[0][0]}, '${req.body.summary}', '${req.body.review}', SYSDATE, :score)`,
                                                            [Number(req.body.review_rating)]);
                } else {
                    const exist_data = existence.rows[0];
                    // console.log(exist_data);
                    const deletion_review = await connection.execute(`DELETE FROM USER_ANIME_REVIEWS WHERE REVIEW_ID = :review_id`, [Number(exist_data[0])]);
                    console.log('review and summary check')
                    console.log(req.body.review);
                    console.log(req.body.summary);
                    console.log(req.body.review_rating);
                    if(req.body.review === '' && req.body.summary === '' && req.body.review_rating === undefined){
                        console.log('review deleted as all the boxes are empty');
                    } else {
                        console.log(req.body.anime_id);
                        console.log(req.params.review_rating);
                        const result = await connection.execute(`INSERT INTO USER_ANIME_REVIEWS (REVIEW_ID, ANIME_ID, USER_ID, SUMMARY, REVIEW, TIME, SCORE) VALUES
                         (:review_id, ${req.body.anime_id}, ${loggedin[0][0]}, '${req.body.summary}', '${req.body.review}', SYSDATE, :score)`, 
                         [Number(exist_data[0]), Number(req.body.review_rating)]);
                    }
                }
            } else if (req.body.review_id_t !== undefined) {
                const existence = await connection.execute(`SELECT * FROM USER_ANIME_REVIEW_VOTES WHERE USER_ID = ${loggedin[0][0]} AND REVIEW_ID = ${req.body.review_id_t}`);
                if(existence.rows.length === 0){
                    if(req.body.vote_type == 1) {
                        const result = await connection.execute(`INSERT INTO USER_ANIME_REVIEW_VOTES (REVIEW_ID, USER_ID, VOTE_TYPE) VALUES (${req.body.review_id_t}, ${loggedin[0][0]}, 1)`);
                        const proc_run = await connection.execute(`CALL REPUTATION_SETTER(100, 50)`);
                    } else if (req.body.vote_type == 0) {
                        const result = await connection.execute(`INSERT INTO USER_ANIME_REVIEW_VOTES (REVIEW_ID, USER_ID, VOTE_TYPE) VALUES (${req.body.review_id_t}, ${loggedin[0][0]}, 0)`);
                        const proc_run = await connection.execute(`CALL REPUTATION_SETTER(100, 50)`);
                    }
                } else {
                    if(req.body.vote_type == 1) {
                        const result = await connection.execute(`UPDATE USER_ANIME_REVIEW_VOTES SET VOTE_TYPE = 1 WHERE REVIEW_ID = ${req.body.review_id_t} AND USER_ID = ${loggedin[0][0]}`);
                        const proc_run = await connection.execute(`CALL REPUTATION_SETTER(100, 50)`);

                    } else if (req.body.vote_type == 0) {
                        const result = await connection.execute(`UPDATE USER_ANIME_REVIEW_VOTES SET VOTE_TYPE = 0 WHERE REVIEW_ID = ${req.body.review_id_t} AND USER_ID = ${loggedin[0][0]}`);
                        const proc_run = await connection.execute(`CALL REPUTATION_SETTER(100, 50)`);
                    }
                }
                if(loggedin.length !==0 ){
                    //const logger = await connection.execute(`INSERT INTO SEARCH_HISTORY (USER_ID, SEARCH_TERM) VALUES (${loggedin[0][0]}, '${req.query.title}')`);
                    const logger = await connection.execute(`CALL FPT_LOG_INSERT(${loggedin[0][0]}, 'PROCEDURE', 'REPUTATION_SETTER', 'UPDATE_REPUTATION', '100<>50')`);
                } else {
                    const logger = await connection.execute(`CALL FPT_LOG_INSERT(NULL, 'PROCEDURE', 'REPUTATION_SETTER', 'UPDATE_REPUTATION', '100<>50')`);
                } 
                
            }
            // console.log('printing what i need')
            // console.log(req.body.anime_id);
            // console.log(req.body.review_id);

            
            await connection.commit();
            await connection.close();
            if(req.body.anime_id === undefined)
            {
                res.send(`
                <script>
                    window.location.href = '/anime/${req.body.anime_id_t}';
                </script>`);
            } else {
                res.send(`
                    <script>
                        window.location.href = '/anime/${req.body.anime_id}';
                    </script>
                `)
            }
        } catch (error) {
            console.log(error);
        }
    }
    run();
});
app.get("/anime/:anime_id/edit", async (req, res)=>{
    try {
        var user_anime_status = 0;
        var edit_access = false;
        const connection = await oracledb.getConnection(dbConfig);
        if(loggedin.length != 0){
            if(Number(loggedin[0][0]) === 3010 || Number(loggedin[0][0]) === 3002){
                edit_access = true;
            } else {
                res.redirect("/anime/"+req.params.anime_id);
            }
            const user_anime_status_t = await connection.execute(`SELECT STATUS FROM USER_ANIME_LIST WHERE USER_ID = ${loggedin[0][0]} AND ANIME_ID = ${req.params.anime_id}`);

            // console.log('printing what i need')
            // console.log(user_anime_status_t.rows.length);
            if(user_anime_status_t.rows.length === 0){
                user_anime_status = 0;
            } else {
                user_anime_status = user_anime_status_t.rows[0][0];
            }
            
        } else {
            user_anime_status = 0;
            res.redirect("/login");
        }
        const result = await connection.execute(`SELECT * FROM ANIME WHERE ANIME_ID = ${req.params.anime_id}`);
        const adapted_manga_ids = await connection.execute(`SELECT * FROM ANIME_X_MANGA WHERE ANIME_ID = ${req.params.anime_id}`);
        const adapted_manga_infos = [];
        for (let i = 0; i < adapted_manga_ids.rows.length; i++) {
            const adapted_manga_info = await connection.execute(`SELECT * FROM MANGA WHERE MANGA_ID = ${adapted_manga_ids.rows[i][1]}`);
            adapted_manga_infos.push(adapted_manga_info.rows[0]);
        }
        const anime_characters_t = await connection.execute(`SELECT C.* FROM CHARACTERS C JOIN CHARACTERS_X_ANIME CXA ON C.CHARACTER_UID = CXA.CHARACTER_UID JOIN ANIME A ON CXA.ANIME_ID = A.ANIME_ID WHERE A.ANIME_ID = ${req.params.anime_id}`);
        const characters = anime_characters_t.rows;
        const data = result.rows;
        const voice_actors_t = await connection.execute(`SELECT P.NAME, P.PERSON_UID, P.IMAGE_LINK FROM PERSON P JOIN VOICE_ARTIST VA ON P.PERSON_UID = VA.PERSON_UID JOIN CHARACTERS_X_ANIME CXA ON VA.CHARACTER_UID = CXA.CHARACTER_UID WHERE CXA.ANIME_ID = ${req.params.anime_id}`);
        const voice_actors = voice_actors_t.rows;
        const studios_t = await connection.execute(`SELECT S.STUDIO_UID, S.NAME, S.IMAGE_LINK FROM STUDIO S JOIN STUDIO_X_ANIME SXA ON S.STUDIO_UID = SXA.STUDIO_UID WHERE SXA.ANIME_ID = :anime_id 
        GROUP BY S.STUDIO_UID, S.NAME, S.IMAGE_LINK`, {anime_id: `${req.params.anime_id}`});
        if(data.length != 1) 
            res.redirect('/');
        adapted_manga_infos.forEach((manga) => {
            console.log(manga[0]);
        });
        console.log(loggedin);
        const genre_t = await connection.execute(`SELECT AG.TYPE_NAME, AG.GENRE_UID FROM ANIME_GENRE AG JOIN ANIME_X_GENRE AXG ON AG.GENRE_UID = AXG.GENRE_UID WHERE AXG.ANIME_ID = ${req.params.anime_id}`);
        const genre = genre_t.rows;
        //console.log(data)
        //console.log(data.length)
        await connection.close();
        res.render('anime_details_edit', { data, adapted_manga_infos, characters, voice_actors, user_anime_status, edit_access, genres: genre, studios:studios_t.rows});
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Internal Server Error');
    }
});

app.post("/anime/:id/edit", async (req, res) => {
    async function run() {
        // console.log('reached here');
        // console.log(req.body.anime_id);
        // console.log(req.body.title_english);
        // console.log(req.body.title_native);
        // console.log(req.body.is_adult);
        // console.log(req.body.episode_count);
        // console.log(req.body.status);
        // console.log(req.body.trailer_link);
        // console.log(req.body.start_date);
        // console.log(req.body.end_date);
        // console.log(req.body.synopsis);
        // console.log(req.body.country_of_origin);
        // console.log(req.body.average_episode_length);

        try {
            const connection = await oracledb.getConnection(dbConfig);
            console.log(req.body.start_date);
            const start_date_split = req.body.start_date.split(" ")
            console.log(start_date_split);
            const end_date_split = req.body.end_date.split(" ")
            console.log(end_date_split);

            const result = await connection.execute(`
                UPDATE ANIME
                SET TITLE_ENGLISH = :title_english,
                    TITLE_NATIVE = :title_native,
                    ISADULT = :is_adult,
                    EPISODE_COUNT = :episode_count,
                    STATUS = :status,
                    TRAILER_LINK = :trailer_link,
                    START_DATE = TO_DATE(:start_date, 'YYYY-MM-DD'),
                    END_DATE = TO_DATE(:end_date, 'YYYY-MM-DD'),
                    SYNOPSIS = :synopsis,
                    COUNTRY_OF_ORIGIN = :country_of_origin,
                    AVERAGE_EPISODE_DURATION = :average_episode_length
                WHERE ANIME_ID = :anime_id
            `, {
                title_english: req.body.title_english,
                title_native: req.body.title_native,
                is_adult: req.body.is_adult,
                episode_count: req.body.episode_count,
                status: req.body.status,
                trailer_link: req.body.trailer_link,
                start_date: (start_date_split[1] !=null || start_date_split[2]!=null || start_date_split[3] != null )? start_date_split[3]+"-"+start_date_split[1]+"-"+start_date_split[2]
                :'',
                end_date:  (end_date_split[1] !=null || end_date_split[2]!=null || end_date_split[3] != null )? end_date_split[3]+"-"+end_date_split[1]+"-"+end_date_split[2]
                :'',
                synopsis: req.body.synopsis,
                country_of_origin: req.body.country_of_origin,
                average_episode_length: Number(req.body.average_episode_length),
                anime_id: req.body.anime_id
            });
            
            await connection.commit(); //to commit //if possible add a timer alert
            await connection.close();
            console.log(result);
            res.send(`
                <script>
                    window.location.href = '/anime/${req.body.anime_id}';
                </script>
            `)
        } catch (error) {
            console.log(error);
        }
    }
    run();
});

app.get("/manga/:manga_id", async (req, res)=>{
    try {
        const connection = await oracledb.getConnection(dbConfig);
        console.log(req.params.manga_id)
        const result = await connection.execute(`SELECT * FROM MANGA WHERE MANGA_ID = ${req.params.manga_id}`);
        const result2 = await connection.execute(`SELECT * FROM ANIME_X_MANGA WHERE MANGA_ID = ${req.params.manga_id}`);
        const adaptations = result2.rows;
        for (let i = 0; i < adaptations.length; i++) {
            const anime = await connection.execute(`SELECT * FROM ANIME WHERE ANIME_ID = ${adaptations[i][0]}`);
            adaptations[i] = anime.rows[0];
        }
        //console.log(adaptations.length); //returns 1 if only adaptation exists
        const manga_characters_t = await connection.execute(`SELECT * FROM CHARACTERS WHERE CHARACTER_UID = ANY(SELECT CHARACTER_UID FROM CHARACTERS_X_MANGA WHERE MANGA_ID = ${req.params.manga_id}) ORDER BY CHARACTER_UID FETCH FIRST 20 ROWS ONLY`);
        const characters = manga_characters_t.rows;
        const author_t = await connection.execute(`SELECT P.PERSON_UID, P.NAME, P.IMAGE_LINK FROM PERSON P JOIN AUTHOR_X_MANGA AXM ON P.PERSON_UID = AXM.PERSON_UID WHERE AXM.MANGA_ID = :manga_id`, {manga_id: `${req.params.manga_id}`});
        const authors = author_t.rows;
        const genre_t = await connection.execute(`SELECT TYPE_NAME, MG.GENRE_UID FROM MANGA_GENRE MG JOIN MANGA_X_GENRE MXG ON MG.GENRE_UID = MXG.GENRE_UID WHERE MXG.MANGA_ID = :manga_id`, {manga_id: `${req.params.manga_id}`});
        const genre = genre_t.rows;

        const data = result.rows;
        //console.log(data[0][1]);

        if(data.length != 1) 
            res.redirect('/');

        //console.log(loggedin)
        var user_rating;
        var user_manga_status = 0;
        var edit_access = false;
        if(loggedin.length != 0){
            const user_manga_status_t = await connection.execute(`SELECT STATUS FROM USER_MANGA_LIST WHERE USER_ID = ${loggedin[0][0]} AND MANGA_ID = ${req.params.manga_id}`);
            const user_rating_t = await connection.execute(`SELECT SCORE FROM USER_MANGA_REVIEWS WHERE USER_ID = ${loggedin[0][0]} AND MANGA_ID = ${req.params.manga_id}`);
            user_rating = user_rating_t.rows;
            // console.log('printing what i need')
            // console.log(user_manga_status_t.rows.length);
            if(user_manga_status_t.rows.length === 0){
                user_manga_status = 0;
            } else {
                user_manga_status = user_manga_status_t.rows[0][0];
            }
            if(Number(loggedin[0][0]) === 3010 || Number(loggedin[0][0]) === 3002){
                edit_access = true;
            }
        } else {
            user_manga_status = 0;
        }
        const avg_score_t = await connection.execute(`SELECT ROUND(AVG(SCORE), 1),COUNT(*) FROM USER_MANGA_REVIEWS WHERE MANGA_ID = ${req.params.manga_id}`);
        const avg_score = avg_score_t.rows[0];
        const per_score_count_t = await connection.execute(`SELECT S.SCORE, COUNT(UMR.SCORE) AS SCORE_COUNT
                                                            FROM (
                                                                SELECT 1 AS SCORE FROM DUAL UNION ALL
                                                                SELECT 2 AS SCORE FROM DUAL UNION ALL
                                                                SELECT 3 AS SCORE FROM DUAL UNION ALL
                                                                SELECT 4 AS SCORE FROM DUAL UNION ALL
                                                                SELECT 5 AS SCORE FROM DUAL
                                                            ) s
                                                            LEFT JOIN USER_MANGA_REVIEWS UMR ON S.SCORE = UMR.SCORE AND UMR.MANGA_ID = :manga_id
                                                            GROUP BY S.SCORE
                                                            ORDER BY NVL(S.SCORE, 0) DESC
                                                            `, 
                                                            {
                                                                manga_id: `${req.params.manga_id}`
                                                            });
        const per_score_count = per_score_count_t.rows;
        const user_reviews_t = await connection.execute(`SELECT REVIEW_ID, MANGA_ID, USER_ID, SCORE, GET_MANGA_REVIEW_VOTES(REVIEW_ID) V,
                                                         SUMMARY AS SUMMARY, REVIEW AS REVIEW, TIME, RETURN_USERNAME(USER_ID) 
                                                         FROM USER_MANGA_REVIEWS 
                                                         WHERE MANGA_ID = :manga_id ORDER BY V DESC`, {manga_id: `${req.params.manga_id}`}); //I MIGHT ADD OPTION TO ORDER BY DIFFERENT PARAMS
        const user_reviews = user_reviews_t.rows;
        if(loggedin.length !==0 ){
            //const logger = await connection.execute(`INSERT INTO SEARCH_HISTORY (USER_ID, SEARCH_TERM) VALUES (${loggedin[0][0]}, '${req.query.title}')`);
            const logger = await connection.execute(`CALL FPT_LOG_INSERT(${loggedin[0][0]}, 'FUNCTION', 'GET_MANGA_REVIEW_VOTES', 'SELECT_REVIEW', '*')`);
            const logger2 = await connection.execute(`CALL FPT_LOG_INSERT(${loggedin[0][0]}, 'FUNCTION', 'RETURN_USERNAME', 'SELECT_REVIEW', '*')`);
        } else {
            const logger = await connection.execute(`CALL FPT_LOG_INSERT(NULL, 'FUNCTION', 'GET_MANGA_REVIEW_VOTES', 'SELECT_REVIEW', '*')`);
            const logger2 = await connection.execute(`CALL FPT_LOG_INSERT(NULL, 'FUNCTION', 'RETURN_USERNAME', 'SELECT_REVIEW', '*')`);
        } 
        //console.log(data)
        //console.log(data.length)
        await connection.close();
        res.render('manga_details', { data, adaptations , characters, user_manga_status, genre, authors, user_rating, avg_score, per_score_count, edit_access, user_reviews});
    } catch (err) {
        console.error(err.message);
        res.redirect('/');
    } 
}); //not complete yet

app.post('/manga/:id', async (req, res) => { 
    async function run()
    {
        if(loggedin.length == 0){
            res.send(`
                <script>
                    alert('Please log in first.');
                    window.location.href = '/login';
                </script>
            `);
        }
        try {
            const connection = await oracledb.getConnection(dbConfig);
            var query = `INSERT INTO USER_MANGA_LIST (USER_ID, MANGA_ID, STATUS) VALUES (:user_id, :manga_id, :status)`;
            // console.log(req.body.anime_id);
            // console.log(req.body.watchlist_status);
            // console.log(loggedin[0][0]);
            if(req.body.watchlist_status !== undefined) {
                const existence = await connection.execute(`SELECT * FROM USER_MANGA_LIST WHERE USER_ID = ${loggedin[0][0]} AND MANGA_ID = ${req.body.manga_id}`);
                if(existence.rows.length === 0){
                    const result = await connection.execute(query, {user_id: `${loggedin[0][0]}`, manga_id: `${Number(req.body.manga_id)}`, status: `${Number(req.body.watchlist_status)}`});
                //console.log(req.body.anime_id);
                } else {
                    if(req.body.watchlist_status == 0){
                        const result = await connection.execute(`DELETE FROM USER_MANGA_LIST WHERE USER_ID = ${loggedin[0][0]} AND MANGA_ID = ${req.body.manga_id}`);
                    } else {
                        const result = await connection.execute(`UPDATE USER_MANGA_LIST SET STATUS = ${Number(req.body.watchlist_status)} WHERE USER_ID = ${loggedin[0][0]} AND MANGA_ID = ${req.body.manga_id}`);
                    }
                }
            } 
            else if (req.body.review !== undefined || req.body.summary !== undefined || req.body.review_rating !== undefined) { //not done yet
                const existence = await connection.execute(`SELECT * FROM USER_MANGA_REVIEWS WHERE USER_ID = ${loggedin[0][0]} AND MANGA_ID = ${req.body.manga_id}`);
                if(existence.rows.length === 0){
                    // var review = '';
                    // var summary = '';
                    // if(req.body.review !== undefined) review = req.body.review;
                    // if(req.body.summary !== undefined) summary = req.body.summary;
                    // console.log(review);
                    // console.log(summary);
                    const result = await connection.execute(`INSERT INTO USER_MANGA_REVIEWS (REVIEW_ID, MANGA_ID, USER_ID, SUMMARY, REVIEW, TIME, SCORE) VALUES 
                                                            (MANGA_REVIEW_SEQ.NEXTVAL, ${req.body.manga_id}, ${loggedin[0][0]}, '${req.body.summary}', '${req.body.review}', SYSDATE, :score)`,
                                                            [Number(req.body.review_rating)]);
                } else {
                    const exist_data = existence.rows[0];
                    // console.log(exist_data);
                    const deletion_review = await connection.execute(`DELETE FROM USER_MANGA_REVIEWS WHERE REVIEW_ID = :review_id`, [Number(exist_data[0])]);
                    console.log('review and summary check')
                    console.log(req.body.review);
                    console.log(req.body.summary);
                    console.log(req.body.review_rating);
                    if(req.body.review === '' && req.body.summary === '' && req.body.review_rating === undefined){
                        console.log('review deleted as all the boxes are empty');
                    } else {
                        console.log(req.body.anime_id);
                        console.log(req.params.review_rating);
                        const result = await connection.execute(`INSERT INTO USER_MANGA_REVIEWS (REVIEW_ID, MANGA_ID, USER_ID, SUMMARY, REVIEW, TIME, SCORE) VALUES
                         (:review_id, ${req.body.manga_id}, ${loggedin[0][0]}, '${req.body.summary}', '${req.body.review}', SYSDATE, :score)`, 
                         {
                                review_id: Number(exist_data[0]),
                                score: Number(req.body.review_rating)
                            
                         });
                    }
                }
            } else if (req.body.review_id_t !== undefined) {
                const existence = await connection.execute(`SELECT * FROM USER_MANGA_REVIEW_VOTES WHERE USER_ID = ${loggedin[0][0]} AND REVIEW_ID = ${req.body.review_id_t}`);
                if(existence.rows.length === 0){
                    if(req.body.vote_type == 1) {
                        const result = await connection.execute(`INSERT INTO USER_MANGA_REVIEW_VOTES (REVIEW_ID, USER_ID, VOTE_TYPE) VALUES (${req.body.review_id_t}, ${loggedin[0][0]}, 1)`);
                        const proc_run = await connection.execute(`CALL REPUTATION_SETTER(100, 50)`);
                    } else if (req.body.vote_type == 0) {
                        const result = await connection.execute(`INSERT INTO USER_MANGA_REVIEW_VOTES (REVIEW_ID, USER_ID, VOTE_TYPE) VALUES (${req.body.review_id_t}, ${loggedin[0][0]}, 0)`);
                        const proc_run = await connection.execute(`CALL REPUTATION_SETTER(100, 50)`);
                    }
                } else {
                    if(req.body.vote_type == 1) {
                        const result = await connection.execute(`UPDATE USER_MANGA_REVIEW_VOTES SET VOTE_TYPE = 1 WHERE REVIEW_ID = ${req.body.review_id_t} AND USER_ID = ${loggedin[0][0]}`);
                        const proc_run = await connection.execute(`CALL REPUTATION_SETTER(100, 50)`);

                    } else if (req.body.vote_type == 0) {
                        const result = await connection.execute(`UPDATE USER_MANGA_REVIEW_VOTES SET VOTE_TYPE = 0 WHERE REVIEW_ID = ${req.body.review_id_t} AND USER_ID = ${loggedin[0][0]}`);
                        const proc_run = await connection.execute(`CALL REPUTATION_SETTER(100, 50)`);
                    }
                }
            }
            // console.log('printing what i need')
            // console.log('manga id below');
            // console.log(req.body.manga_id);
            // console.log(req.body.review_id);

            
            await connection.commit();
            await connection.close();
            if(req.body.manga_id === undefined)
            {
                res.send(`
                <script>
                    window.location.href = '/manga/${req.body.manga_id_t}';
                </script>
                `);
            } else {
                res.send(`
                    <script>
                        window.location.href = '/manga/${req.body.manga_id}';
                    </script>
                `)
            }
        } catch (error) {
            console.log(error);
        }
    }
    run();
});

// app.get("/manga/:manga_id/add/anime", async (req, res)=>{
//     //if(loggedin.length === 0){
//         //res.redirect('/login');
//     //} else {
//         //if(loggedin[0][3] == 'Admin' || loggedin[0][3] == 'Moderator'){
//             try{
//                 const connection = await oracledb.getConnection(dbConfig);
//                 const result = await connection.execute(`SELECT ANIME_ID, TITLE_ENGLISH FROM ANIME`);
//                 const animes = result.rows;
//                 res.render('anime_add_through_manga', {manga_id: req.params.manga_id, animes_m: animes});
//             } catch (error) {
//                 console.log(error);
//             }
//         //}
//     //}

// });
// var cpUpload = upload.fields([{ name: 'banner_image', maxCount: 1 }, { name: 'cover_image', maxCount: 1 }]);
// app.post("/manga/:manga_id/add/anime", cpUpload, async (req, res)=>{
//     try {
//         //console.log(req.files);
//         const connection = await oracledb.getConnection(dbConfig);
//         const result2 = await connection.execute(
//             `INSERT INTO ANIME_X_MANGA VALUES (:anime_id, :manga_id)`,
//             {
//                 anime_id: req.body.anime_id[0],
//                 manga_id: req.params.manga_id
//             }
//         )
//         await connection.commit();
//         await connection.close();
//         res.redirect(`/manga/${req.params.manga_id}/add/anime`);
//     } catch (error) {
//         console.log(error);
//     }
// });
app.get('/manga/:manga_id/add/anime', async (req, res) => {
    try {
        const connection = await oracledb.getConnection(dbConfig);
        const year_t = await connection.execute(`SELECT EXTRACT(YEAR FROM START_DATE) AS START_YEAR 
            FROM ANIME GROUP BY EXTRACT(YEAR FROM START_DATE) ORDER BY EXTRACT(YEAR FROM START_DATE) DESC`);
        const year = year_t.rows;

        const country_of_origin_t = await connection.execute(`SELECT COUNTRY_OF_ORIGIN FROM ANIME GROUP BY COUNTRY_OF_ORIGIN ORDER BY COUNTRY_OF_ORIGIN`);
        const country_of_origin = country_of_origin_t.rows;
        const nsfw_stat = (loggedin.length === 0)? `'NO'` : `USER_NSFW_STATUS(${loggedin[0][0]})`;
        const result = await connection.execute(`SELECT ANIME_ID, TITLE_ENGLISH, TITLE_NATIVE, COVER_IMAGE, ISADULT FROM ANIME WHERE ISADULT LIKE ` +nsfw_stat+  `ORDER BY VISIT_COUNT DESC FETCH FIRST 50 ROWS ONLY`);
        if(loggedin.length !==0 ){
            const logger = await connection.execute(`CALL FPT_LOG_INSERT(${loggedin[0][0]}, 'FUNCTION', 'USER_NSFW_STATUS', 'HOME', '${loggedin[0][0]}')`);
        }
        const data = result.rows;
        await connection.close();
        console.log(loggedin)
        //console.log(data)
        //console.log(data.length)
        res.render('anime_add_over_manga', { data, year, country_of_origin, page_index: 0, manga_id: req.params.manga_id });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Internal Server Error');
    }
});
app.get('/manga/:manga_id/add/anime/search', async (req, res) => {
   
    console.log(req.query.title.toLowerCase());
    // console.log('Search term post:', searchAnime);
    // const searchLower = searchAnime.toLowerCase();
    try {
        const connection = await oracledb.getConnection(dbConfig);
        const year_t = await connection.execute(`SELECT EXTRACT(YEAR FROM START_DATE) AS START_YEAR 
            FROM ANIME GROUP BY EXTRACT(YEAR FROM START_DATE) ORDER BY EXTRACT(YEAR FROM START_DATE) DESC`);
        const year = year_t.rows;

        const country_of_origin_t = await connection.execute(`SELECT COUNTRY_OF_ORIGIN FROM ANIME GROUP BY COUNTRY_OF_ORIGIN ORDER BY COUNTRY_OF_ORIGIN`);
        const country_of_origin = country_of_origin_t.rows;

        // const result = await connection.execute(`SELECT ANIME_ID, TITLE_ENGLISH, TITLE_NATIVE, COVER_IMAGE FROM ANIME
        //  WHERE LOWER(TITLE_ENGLISH) LIKE '%${searchLower}%' OR LOWER(TITLE_NATIVE) LIKE '%${searchLower}%'`);
        // const data = result.rows;
        //console.log(req.query.title, req.query.year, req.query.country, req.query.genre, req.query.characters, req.query.studio.toLowerCase())
        console.log(req.query.page_index)
        const year_query = (req.query.year != 0) ? `AND (EXTRACT(YEAR FROM A.START_DATE) <= ${Number(req.query.year)}
        AND (EXTRACT(YEAR FROM A.END_DATE) >= ${Number(req.query.year)} OR A.END_DATE IS NULL))` : ``;

        const manga_adapted_query = (req.query.manga_adapted == 'on') ? `AND A.ANIME_ID IN (SELECT ANIME_ID FROM ANIME_X_MANGA)` : '';
        const studio_query = (req.query.studio != '') ? `AND (LOWER(S.NAME) LIKE '%${req.query.studio.toLowerCase()}%')` : '';
        const character_query = (req.query.characters != '') ? `AND (LOWER(C.FIRST_NAME || ' ' || C.LAST_NAME) LIKE '%${req.query.characters.toLowerCase()}%')` : '';
        const nsfw_stat = (loggedin.length === 0)? `'NO'` : `USER_NSFW_STATUS(${loggedin[0][0]})`;
        const country_query = (req.query.country != '') ? `AND A.COUNTRY_OF_ORIGIN LIKE '%${req.query.country}%'` : '';
        const status_query = (req.query.status != '') ? `AND A.STATUS LIKE '%${req.query.status.toUpperCase()}%'` : '';
        const genre_query = (req.query.genre != '') ? `AND (LOWER(AG.TYPE_NAME) LIKE '%${req.query.genre.toLowerCase()}%')` : '';
        const search_t = await connection.execute(
            `
            WITH A_S AS
            (SELECT * FROM ANIME A WHERE ( (LOWER(A.TITLE_ENGLISH) LIKE '%' || :title || '%') OR EDIT_DISTANCE_MAIN(LOWER(A.TITLE_ENGLISH), '${req.query.title.toLowerCase()}') <= 2)`
                                                                    +country_query + status_query
                                                                    + year_query + `
            )
            SELECT A.ANIME_ID, A.TITLE_ENGLISH, A.TITLE_NATIVE, A.COVER_IMAGE, A.ISADULT
                FROM A_S A FULL JOIN ANIME_X_GENRE AXG ON A.ANIME_ID = AXG.ANIME_ID
                        FULL JOIN CHARACTERS_X_ANIME CXA ON CXA.ANIME_ID = A.ANIME_ID 
						FULL JOIN CHARACTERS C ON CXA.CHARACTER_UID = C.CHARACTER_UID
                        FULL JOIN ANIME_GENRE AG ON AG.GENRE_UID = AXG.GENRE_UID
                        FULL JOIN ANIME_X_MANGA AXM ON AXM.ANIME_ID = A.ANIME_ID
                        FULL JOIN STUDIO_X_ANIME SXA ON SXA.ANIME_ID = A.ANIME_ID
                        FULL JOIN STUDIO S ON S.STUDIO_UID = SXA.STUDIO_UID
                WHERE ISADULT LIKE `+nsfw_stat+`
                ` + genre_query
                + manga_adapted_query + studio_query + character_query +
            `GROUP BY A.ANIME_ID, A.TITLE_ENGLISH, A.TITLE_NATIVE, A.COVER_IMAGE, A.ISADULT
            OFFSET ${Number(req.query.page_index)*50} ROWS FETCH NEXT 50 ROWS ONLY
            `,
            {
                title: req.query.title.toLowerCase()
            }
        );
        if(loggedin.length !==0 ){
            //const logger = await connection.execute(`INSERT INTO SEARCH_HISTORY (USER_ID, SEARCH_TERM) VALUES (${loggedin[0][0]}, '${req.query.title}')`);
            const logger = await connection.execute(`CALL FPT_LOG_INSERT(${loggedin[0][0]}, 'FUNCTION', 'EDIT_DISTANCE_MAIN', 'SEARCH_ANIME', '${req.query.title}')`);
            const logger2 = await connection.execute(`CALL FPT_LOG_INSERT(${loggedin[0][0]}, 'FUNCTION', 'USER_NSFW_STATUS', 'SEARCH_FILTER', '${loggedin[0][0]}')`);
        } else {
            const logger = await connection.execute(`CALL FPT_LOG_INSERT(NULL, 'FUNCTION', 'EDIT_DISTANCE_MAIN', 'SEARCH_ANIME', '${req.query.title}')`);
        }
        const data = search_t.rows;
        //console.log(data)
        // const anime_complex = search_t.rows;
        // //console.log(anime_complex[0])
        // console.log(req.query.title, req.query.year, req.query.country, req.query.genre, req.query.characters, req.query.studio, req.query.staff)
        console.log(req.query.manga_adapted);
        await connection.close();
        res.render('anime_add_over_manga_search', {data, year, country_of_origin, page_index: Number(req.query.page_index)+1, title: req.query.title, year_s: req.query.year, 
            country_s: req.query.country, status_s: req.query.status, manga_adapted_s: req.query.manga_adapted, genre_s: req.query.genre,
            characters_s: req.query.characters, studio_s: req.query.studio, manga_id: req.params.manga_id});
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Internal Server Error');
    }
  
});
app.get('/manga/:manga_id/add/anime/:anime_id', async (req, res) => {
    try {
        const connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(`INSERT INTO ANIME_X_MANGA VALUES (:anime_id, :manga_id)`,
         {anime_id: `${req.params.anime_id}`, manga_id: `${req.params.manga_id}`});
        await connection.commit();
        await connection.close();
        res.redirect(`/manga/${req.params.manga_id}`);
    } catch (err) {
        console.error(err);
        res.send(err);
    }
});

app.get('/manga/:manga_id/add/author/search', async (req, res) => {
    try {
        const connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(`SELECT * FROM PERSON WHERE PERSON_UID NOT IN (SELECT PERSON_UID FROM AUTHOR_X_MANGA WHERE MANGA_ID = ${req.params.manga_id})
        AND (LOWER(NAME) LIKE '%${req.query.name.toLowerCase()}%')
        OFFSET ${Number(req.query.page_index)*50} ROWS FETCH NEXT 50 ROWS ONLY`);
        const data = result.rows;
        await connection.close();
        res.render('manga_add_author', {data, manga_id: req.params.manga_id, page_index: Number(req.query.page_index)+1, name: req.query.name});
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});


app.get('/manga/:manga_id/add/author/', async (req, res) => {
    try {
        const connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(`SELECT * FROM PERSON WHERE PERSON_UID NOT IN (SELECT PERSON_UID FROM AUTHOR_X_MANGA WHERE MANGA_ID = ${req.params.manga_id})
        OFFSET 0 ROWS FETCH NEXT 50 ROWS ONLY`);
        const data = result.rows;
        await connection.close();
        res.render('manga_add_author', {data, manga_id: req.params.manga_id, page_index: 0, name: req.query.name});
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/manga/:manga_id/add/author/:author_id', async (req, res) => {
    try {
        const connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(`INSERT INTO AUTHOR_X_MANGA(PERSON_UID, MANGA_ID) VALUES (:author_id, :manga_id)`,
            {author_id: `${req.params.author_id}`, manga_id: `${req.params.manga_id}`});
        await connection.commit();
        await connection.close();
        res.redirect(`/manga/${req.params.manga_id}`);
    } catch (err) {
        console.error(err);
        res.send(err);
    }
});

app.get("/manga/:manga_id/edit", async (req, res)=>{
    try {
        var user_manga_status = 0;
        var edit_access = false;
        const connection = await oracledb.getConnection(dbConfig);
        if(loggedin.length != 0){
            if((loggedin[0][3]) === 'Admin' || (loggedin[0][3]) === 'Admin'){
                edit_access = true;
            } else {
                res.redirect("/");
            }
            const user_manga_status_t = await connection.execute(`SELECT STATUS FROM USER_MANGA_LIST WHERE USER_ID = ${loggedin[0][0]} AND MANGA_ID = ${req.params.manga_id}`);

            // console.log('printing what i need')
            // console.log(user_manga_status_t.rows.length);
            if(user_manga_status_t.rows.length === 0){
                user_manga_status = 0;
            } else {
                user_manga_status = user_manga_status_t.rows[0][0];
            }
            
        } else {
            user_manga_status = 0;
            res.redirect("/");
        }
        const result = await connection.execute(`SELECT * FROM MANGA WHERE MANGA_ID = ${req.params.manga_id}`);
        const adaptations = await connection.execute(`SELECT * FROM ANIME WHERE ANIME_ID = ANY(SELECT ANIME_ID FROM ANIME_X_MANGA WHERE MANGA_ID = ${req.params.manga_id}) ORDER BY ANIME_ID`);
        const manga_characters_t = await connection.execute(`SELECT * FROM CHARACTERS WHERE CHARACTER_UID = ANY(SELECT CHARACTER_UID FROM CHARACTERS_X_MANGA WHERE MANGA_ID = ${req.params.manga_id}) ORDER BY CHARACTER_UID`);
        const characters = manga_characters_t.rows;
        const author_t = await connection.execute(`SELECT P.PERSON_UID, P.NAME, P.IMAGE_LINK FROM PERSON P JOIN AUTHOR_X_MANGA AXM ON P.PERSON_UID = AXM.PERSON_UID WHERE AXM.MANGA_ID = :manga_id`, {manga_id: `${req.params.manga_id}`});
        const authors = author_t.rows;
        const genre_t = await connection.execute(`SELECT TYPE_NAME, MG.GENRE_UID FROM MANGA_GENRE MG JOIN MANGA_X_GENRE MXG ON MG.GENRE_UID = MXG.GENRE_UID WHERE MXG.MANGA_ID = :manga_id`, {manga_id: `${req.params.manga_id}`});
        const genre = genre_t.rows;
        const data = result.rows;
        //console.log(data[0][1]);

        if(data.length != 1)
            res.redirect('/');
        //console.log(loggedin);
        //console.log(data)
        //console.log(data.length)
        await connection.close();
        res.render('manga_details_edit', { data, adapted_anime_infos:adaptations.rows , characters, user_manga_status, genres:genre, authors, edit_access });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Internal Server Error');
    }
});

app.post("/manga/:manga_id/edit", async (req, res) => {
    async function run() {
        // console.log('reached here');
        // console.log(req.body.anime_id);
        // console.log(req.body.title_english);
        // console.log(req.body.title_native);
        // console.log(req.body.is_adult);
        // console.log(req.body.episode_count);
        // console.log(req.body.status);
        // console.log(req.body.trailer_link);
        // console.log(req.body.start_date);
        // console.log(req.body.end_date);
        // console.log(req.body.synopsis);
        // console.log(req.body.country_of_origin);
        // console.log(req.body.average_episode_length);

        try {
            const connection = await oracledb.getConnection(dbConfig);
            //console.log(req.body.start_date);
            const start_date_split = req.body.start_date.split(" ")
            //console.log(start_date_split);
            const end_date_split = req.body.end_date.split(" ")
            //console.log(end_date_split);

            const result = await connection.execute(`
                UPDATE MANGA
                SET TITLE_ENGLISH = :title_english,
                    TITLE_NATIVE = :title_native,
                    ISADULT = :is_adult,
                    CHAPTERS = :chapters,
                    VOLUMES = :volumes,
                    STATUS = :status,
                    START_DATE = TO_DATE(:start_date, 'YYYY-MM-DD'),
                    END_DATE = TO_DATE(:end_date, 'YYYY-MM-DD'),
                    SYNOPSIS = :synopsis,
                    COUNTRY_OF_ORIGIN = :country_of_origin,
                    BANNER_IMAGE = :banner_image,
                    COVER_IMAGE = :cover_image
                WHERE MANGA_ID = :manga_id
            `, {
                title_english: req.body.title_english,
                title_native: req.body.title_native,
                is_adult: req.body.is_adult,
                chapters: req.body.chapters,
                volumes: req.body.volumes,
                status: req.body.status,
                start_date: (start_date_split[1] !=null || start_date_split[2]!=null || start_date_split[3] != null )? start_date_split[3]+"-"+start_date_split[1]+"-"+start_date_split[2]
                :'',
                end_date:  (end_date_split[1] !=null || end_date_split[2]!=null || end_date_split[3] != null )? end_date_split[3]+"-"+end_date_split[1]+"-"+end_date_split[2]
                :'',
                synopsis: req.body.synopsis,
                country_of_origin: req.body.country_of_origin,
                banner_image: req.body.banner_image,
                cover_image: req.body.cover_image,
                manga_id: req.params.manga_id
            });

            await connection.commit(); //to commit //if possible add a timer alert
            await connection.close();
            //console.log(result);
            res.send(`
                <script>
                    window.location.href = '/manga/${req.body.manga_id}';
                </script>
            `)
        } catch (error) {
            console.log(error);
        }
    }
    run();
});
app.get("/manga/:manga_id/add/genre", async (req, res)=>{
    if(loggedin.length === 0){
        res.redirect('/login');
    } else {
        if(loggedin[0][3] == 'Admin' || loggedin[0][3] == 'Moderator'){
            const connection = await oracledb.getConnection(dbConfig);
            const genre_t = await connection.execute(`SELECT * FROM MANGA_GENRE`);
            const genre = genre_t.rows;
            res.render('genre_add_over_manga', {manga_id: req.params.manga_id, genres:genre});
        }
    }
});
app.post("/manga/:manga_id/add/genre", async (req, res)=>{

    const connection = await oracledb.getConnection(dbConfig);
    if(req.body.genre !== undefined) {
        for(let i=0; i< req.body.genre.length; i++){
            const result = await connection.execute(`INSERT INTO MANGA_X_GENRE (MANGA_ID, GENRE_UID) VALUES (:manga_id, :genre)`,
                                                    {
                                                        manga_id: req.params.manga_id,
                                                        genre: req.body.genre[i]
                                                    });
        }
    }
    await connection.commit();
    await connection.close();
    res.redirect('/manga/'+req.params.manga_id);
});
app.get("/manga/:manga_id/:genre_id/delete", async (req, res)=>{
    if(loggedin.length === 0){
        res.redirect('/login');
    } else {
        if(loggedin[0][3] == 'Admin' || loggedin[0][3] == 'Moderator'){
            const connection = await oracledb.getConnection(dbConfig);
            const result = await connection.execute(`DELETE FROM MANGA_X_GENRE WHERE MANGA_ID = ${req.params.manga_id} AND GENRE_UID = ${req.params.genre_id}`);
            await connection.commit();
            await connection.close();
            res.redirect('/manga/'+req.params.manga_id);
        }
    }
});

app.get("/manga", async(req, res)=>{
    try {
        const connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(`SELECT MANGA_ID, TITLE_ENGLISH, TITLE_NATIVE, COVER_IMAGE FROM MANGA
                                                 WHERE ISADULT = 'NO'
                                                 ORDER BY manga_id FETCH FIRST 50 ROWS ONLY`);
        const data = result.rows;
        const country_of_origin_t = await connection.execute(`SELECT COUNTRY_OF_ORIGIN FROM MANGA GROUP BY COUNTRY_OF_ORIGIN ORDER BY COUNTRY_OF_ORIGIN`);
        const country_of_origin = country_of_origin_t.rows;
        const year_t = await connection.execute(`SELECT EXTRACT(YEAR FROM START_DATE) AS START_YEAR 
        FROM MANGA GROUP BY EXTRACT(YEAR FROM START_DATE) ORDER BY EXTRACT(YEAR FROM START_DATE) DESC`);
        const year = year_t.rows;
        await connection.close();
        console.log(loggedin)
        //console.log(data)
        //console.log(data.length)
        res.render('manga_home', { data, country_of_origin, year, page_index: 0 });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Internal Server Error');
    }
});

// app.get("/search_manga", async(req, res)=>{
//     try {
//         const connection = await oracledb.getConnection(dbConfig);
//         console.log(req.query.year);
//         const year_query = (req.query.year !== '0') ? 
//         `AND (TO_CHAR(M.START_DATE, 'YYYY') <= '${(req.query.year)}') AND (TO_CHAR(M.END_DATE, 'YYYY') >= ${(req.query.year)})` : '';
//         const result = await connection.execute(`SELECT M.MANGA_ID, M.TITLE_ENGLISH, M.TITLE_NATIVE, M.COVER_IMAGE 
//                                                 FROM MANGA M FULL JOIN MANGA_X_GENRE MXG ON M.MANGA_ID = MXG.MANGA_ID
//                                                 FULL JOIN MANGA_GENRE MG ON MXG.GENRE_UID = MG.GENRE_UID
//                                                 FULL JOIN CHARACTERS_X_MANGA CXM ON CXM.MANGA_ID = M.MANGA_ID
//                                                 FULL JOIN CHARACTERS C ON CXM.CHARACTER_UID = C.CHARACTER_UID
//                                                 WHERE (LOWER(TITLE_ENGLISH) LIKE '%${req.query.title.toLowerCase()}%' OR LOWER(TITLE_NATIVE) LIKE '%${req.query.title.toLowerCase()}%')
//                                                 AND (LOWER(MG.TYPE_NAME) LIKE '%${req.query.genre.toLowerCase()}%' OR MG.TYPE_NAME IS NULL)
//                                                 AND (LOWER(M.STATUS) LIKE '%${req.query.status.toLowerCase()}%' OR M.STATUS IS NULL)
//                                                 AND (LOWER(M.COUNTRY_OF_ORIGIN) LIKE '%${req.query.country.toLowerCase()}%' OR M.COUNTRY_OF_ORIGIN IS NULL)
//                                                 AND (LOWER(C.FIRST_NAME || ' ' || C.LAST_NAME) LIKE '%${req.query.character.toLowerCase()}%')
//                                                 ` + year_query + `
//                                                 GROUP BY M.MANGA_ID, M.TITLE_ENGLISH, M.TITLE_NATIVE, M.COVER_IMAGE
//                                                 `);
//         const data = result.rows;
//         const country_of_origin_t = await connection.execute(`SELECT COUNTRY_OF_ORIGIN FROM MANGA GROUP BY COUNTRY_OF_ORIGIN ORDER BY COUNTRY_OF_ORIGIN`);
//         const country_of_origin = country_of_origin_t.rows;
//         const year_t = await connection.execute(`SELECT EXTRACT(YEAR FROM START_DATE) AS START_YEAR 
//                                                 FROM MANGA GROUP BY EXTRACT(YEAR FROM START_DATE) ORDER BY EXTRACT(YEAR FROM START_DATE) DESC`);
//         const year = year_t.rows;
//         //console.log(country_of_origin);
//         await connection.close();
//         console.log(loggedin)
//         //console.log(data)
//         //console.log(data.length)
//         res.render('manga_search', { data, country_of_origin, year });
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Internal Server Error');
//     }
// });

app.get("/search_manga", async(req, res)=>{ //DONE
    try {
        const connection = await oracledb.getConnection(dbConfig);
        const title_query_activation = (req.query.title != '') ? true : false;
        const title_query = (req.query.title != '') ? `(LOWER(M.TITLE_ENGLISH) LIKE '%${req.query.title.toLowerCase()}%' OR LOWER(M.TITLE_NATIVE) LIKE '%${req.query.title.toLowerCase()}%' OR EDIT_DISTANCE_MAIN(LOWER(M.TITLE_ENGLISH), '${req.query.title.toLowerCase()}') <= 2)` : '';
        const genre_query_activation = (req.query.genre != '') ? true : false;
        const genre_query = (req.query.genre != '') ? `AND (LOWER(MG.TYPE_NAME) LIKE '%${req.query.genre.toLowerCase()}%')` : '';
        const character_query = (req.query.character != '') ? `AND (LOWER(C.FIRST_NAME || ' ' || C.LAST_NAME) LIKE '%${req.query.character.toLowerCase()}%')` : '';
        const character_query_activation = (req.query.character != '') ? true : false;
        const author_query_activation = (req.query.author != '') ? true : false;
        const author_query = (req.query.author != '') ? `AND LOWER(P.NAME) LIKE '%${req.query.author.toLowerCase()}%'` : '';
        const year_query = (req.query.year != 0) ? `AND (EXTRACT(YEAR FROM M.START_DATE) <= ${Number(req.query.year)}
        AND (EXTRACT(YEAR FROM M.END_DATE) >= ${Number(req.query.year)} OR M.END_DATE IS NULL))` : ``;
        const status_query = (req.query.status != '') ? `AND (LOWER(M.STATUS) LIKE '%${req.query.status.toLowerCase()}%')` : '';
        const country_query = (req.query.country != '') ? `AND (LOWER(M.COUNTRY_OF_ORIGIN) LIKE '%${req.query.country.toLowerCase()}%')` : '';
        const result = await connection.execute(`
            WITH M_S AS
            (
                SELECT * FROM MANGA M WHERE (LOWER(M.TITLE_ENGLISH) LIKE '%${req.query.title.toLowerCase()}%' OR LOWER(M.TITLE_NATIVE) LIKE '%${req.query.title.toLowerCase()}%' OR EDIT_DISTANCE_MAIN(LOWER(M.TITLE_ENGLISH), '${req.query.title.toLowerCase()}') <= 2)
                                            ` + status_query + country_query
                                            + year_query + `
            )
            SELECT M.MANGA_ID, M.TITLE_ENGLISH, M.TITLE_NATIVE, M.COVER_IMAGE 
            FROM M_S M ${genre_query_activation ? `FULL JOIN MANGA_X_GENRE MXG ON M.MANGA_ID = MXG.MANGA_ID
                                                    FULL JOIN MANGA_GENRE MG ON MXG.GENRE_UID = MG.GENRE_UID` : ''} 
            ${character_query_activation ? `FULL JOIN CHARACTERS_X_MANGA CXM ON CXM.MANGA_ID = M.MANGA_ID
                                            FULL JOIN CHARACTERS C ON C.CHARACTER_UID = CXM.CHARACTER_UID` : ''}
            ${author_query_activation ? `FULL JOIN AUTHOR_X_MANGA AXM ON AXM.MANGA_ID = M.MANGA_ID
                                        FULL JOIN PERSON P ON P.PERSON_UID = AXM.PERSON_UID` : ''}
            WHERE M.MANGA_ID IS NOT NULL 
            ${genre_query}
            ${character_query}
            ${author_query}
            GROUP BY M.MANGA_ID, M.TITLE_ENGLISH, M.TITLE_NATIVE, M.COVER_IMAGE
            OFFSET ${Number(req.query.page_index)*50} ROWS FETCH NEXT 50 ROWS ONLY
        `);
        if(loggedin.length !==0 ){
            //const logger = await connection.execute(`INSERT INTO SEARCH_HISTORY (USER_ID, SEARCH_TERM) VALUES (${loggedin[0][0]}, '${req.query.title}')`);
            const logger = await connection.execute(`CALL FPT_LOG_INSERT(${loggedin[0][0]}, 'FUNCTION', 'EDIT_DISTANCE_MAIN', 'SEARCH_MANGA', '${req.query.title}')`);
        } else {
            const logger = await connection.execute(`CALL FPT_LOG_INSERT(NULL, 'FUNCTION', 'EDIT_DISTANCE_MAIN', 'SEARCH_MANGA', '${req.query.title}')`);
        }

        const data = result.rows;
        const country_of_origin_t = await connection.execute(`SELECT COUNTRY_OF_ORIGIN FROM MANGA GROUP BY COUNTRY_OF_ORIGIN ORDER BY COUNTRY_OF_ORIGIN`);
        const country_of_origin = country_of_origin_t.rows;
        const year_t = await connection.execute(`SELECT EXTRACT(YEAR FROM START_DATE) AS START_YEAR 
                                                FROM ANIME GROUP BY EXTRACT(YEAR FROM START_DATE) ORDER BY EXTRACT(YEAR FROM START_DATE) DESC`);
        const year = year_t.rows;
        //console.log(country_of_origin);
        await connection.close();
        console.log(loggedin)
        //console.log(data)
        //console.log(data.length)
        res.render('manga_search', { data, country_of_origin, year, title_s:req.query.title, genre_s:req.query.genre, 
            character_s:req.query.character, author_s:req.query.author, year_s:req.query.year, status_s:req.query.status, 
            country_s:req.query.country, page_index: Number(req.query.page_index)+1 });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Internal Server Error');
    }
});

app.get("/admin/add/manga", async (req, res)=>{
    // if(loggedin.length === 0){
    //     res.redirect('/');
    // }
    //else if((loggedin[0][3]) === 'Admin' || (loggedin[0][3]) === 'Moderator'){
        const connection = await oracledb.getConnection(dbConfig);
        const genre_t = await connection.execute(`SELECT * FROM MANGA_GENRE`);
        const genre = genre_t.rows;
        await connection.close();
        res.render('admin_manga_add', { genres: genre});
    // } else {
    //     res.redirect('/');
    // }   
});
cpUpload = upload.fields([{ name: 'banner_image', maxCount: 1 }, { name: 'cover_image', maxCount: 1 }, { name: 'image_link[]', maxCount: 1000 }])
app.post("/admin/add/manga", cpUpload, async (req, res) => {
    async function run() {
        // console.log(req.body.manga_id, req.body.title_english, req.body.title_native, req.body.is_adult, req.body.chapters,
        //     req.body.volumes, req.body.status, req.body.demographics, req.body.start_date, req.body.end_date, req.body.synopsis, req.body.country_of_origin, req.body.banner_image, req.body.cover_image)
        try{
            const connection = await oracledb.getConnection(dbConfig);
            const result = await connection.execute(`INSERT INTO MANGA (MANGA_ID, TITLE_ENGLISH, TITLE_NATIVE, ISADULT, 
                                                CHAPTERS, VOLUMES, STATUS, START_DATE, END_DATE, SYNOPSIS, COUNTRY_OF_ORIGIN,
                                                BANNER_IMAGE, COVER_IMAGE)
                                                VALUES (MANGA_ID_SEQ.NEXTVAL, :title_english, :title_native, :is_adult, :chapters, :volumes, :status, 
                                                    TO_DATE(:start_date, 'YYYY-MM-DD'), TO_DATE(:end_date, 'YYYY-MM-DD'), :synopsis, :country_of_origin
                                                    , :banner_image, :cover_image)`,
                                                {
                                                    title_english: req.body.title_english,
                                                    title_native: req.body.title_native,
                                                    is_adult: req.body.is_adult,
                                                    chapters: req.body.chapters,
                                                    volumes: req.body.volumes,
                                                    status: req.body.status,
                                                    start_date: req.body.start_date,
                                                    end_date: req.body.end_date,
                                                    synopsis: req.body.synopsis,
                                                    country_of_origin: req.body.country_of_origin,
                                                    banner_image: (req.files['banner_image'] == undefined)? '': 'http://localhost:3000/'+req.files['banner_image'][0].path.substring(7),
                                                    cover_image: (req.files['cover_image'] == undefined)? '': 'http://localhost:3000/'+req.files['cover_image'][0].path.substring(7)
                                                });
            if(req.body.genre !== undefined){
                for(var i = 0; i < req.body.genre.length; i++){
                    const genre_insert = await connection.execute(`INSERT INTO MANGA_X_GENRE (MANGA_ID, GENRE_UID)
                    VALUES (MANGA_ID_SEQ.CURRVAL, :genre)`, {genre: Number(req.body.genre[i])});
                }
            }
            if(req.body.first_name !== undefined){
                for (var i = 0; i < req.body.first_name.length; i++){
                    const author_insert = await connection.execute(`INSERT INTO CHARACTERS (CHARACTER_UID, FIRST_NAME, LAST_NAME, ROLE_PLAY, DESCRIPTION, IMAGE_LINK)
                    VALUES (CHARACTER_ID_SEQ.NEXTVAL, :first_name, :last_name, :role_play, :description, :image_link)`,
                    {
                        first_name: req.body.first_name[i],
                        last_name: req.body.last_name[i],
                        role_play: req.body.role_play[i],
                        description: req.body.description[i],
                        image_link: (req.files['image_link[]'] == undefined)? '': 'http://localhost:3000/'+req.files['image_link[]'][i].path.substring(7)
                    });
                    const character_insert = await connection.execute(`INSERT INTO CHARACTERS_X_MANGA (CHARACTER_UID, MANGA_ID)
                    VALUES (CHARACTER_ID_SEQ.CURRVAL, MANGA_ID_SEQ.CURRVAL)`);
                }
            }
            
            await connection.commit();
            await connection.close();

        } catch (error) {
            console.log(error);
        }
    }
    run();
    res.redirect('/admin/add/manga');
});

app.get('/admin/add/anime/genre', async (req, res, next) => {
    try {
        //loginCheck(req, res);
        res.render('admin_anime_genre_add');
    } catch (error) {
        console.log(error);
    }
});
app.post('/admin/add/anime/genre', async (req, res, next) => {
    try {
        const connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(`INSERT INTO ANIME_GENRE (GENRE_UID, TYPE_NAME, GENRE_DESCRIPTION) 
                                                VALUES (ANIME_GENRE_UID_SEQ.NEXTVAL, :type_name, :description)`,
                                                 {
                                                    type_name: req.body.type_name,
                                                    description: req.body.description
                                                });
        await connection.commit();
        await connection.close();
        res.redirect('/admin/add/anime/genre');
    } catch (error) {
        console.log(error);
        res.send(`
            <script>
                alert('Error. Maybe Uniqueness?');
                window.location.href = '/admin/add/anime/genre';
            </script>
        `);
    }
});
app.get('/admin/add/manga/genre', async (req, res, next) => {
    try {
        //loginCheck(req, res);
        res.render('admin_manga_genre_add');
    } catch (error) {
        console.log(error);
    }
});
app.post('/admin/add/manga/genre', async (req, res, next) => {
    try {
        const connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(`INSERT INTO MANGA_GENRE (GENRE_UID, TYPE_NAME, GENRE_DESCRIPTION) 
                                                VALUES (MANGA_GENRE_UID_SEQ.NEXTVAL, :type_name, :description)`,
                                                 {
                                                    type_name: req.body.type_name,
                                                    description: req.body.description
                                                });
        await connection.commit();
        await connection.close();
        res.redirect('/admin/add/manga/genre');
    } catch (error) {
        console.log(error);
        res.send(`
            <script>
                alert('Error. Maybe Uniqueness?');
                window.location.href = '/admin/add/manga/genre';
            </script>
        `);
    }
});

app.get('/characters', async (req, res) => {
    try{
        const connection = await oracledb.getConnection(dbConfig);
        const visit_count_increment = await connection.execute(`UPDATE CHARACTERS SET VISIT_COUNT = VISIT_COUNT + 1`);
        const result = await connection.execute(`SELECT * FROM CHARACTERS ORDER BY VISIT_COUNT, NVL(GET_CHARACTER_RATING(CHARACTER_UID), 0) DESC FETCH FIRST 50 ROWS ONLY`);
        if(loggedin.length !==0 ){
            const logger = await connection.execute(`CALL FPT_LOG_INSERT(${loggedin[0][0]}, 'FUNCTION', 'GET_CHARACTER_RATING', 'SELECT_CHARACTERS', '*')`);
        } else {
            const logger = await connection.execute(`CALL FPT_LOG_INSERT(NULL, 'FUNCTION', 'GET_CHARACTER_RATING', 'SELECT_CHARACTERS', '*')`);
        }
        const data = result.rows;
        await connection.close();
        res.render('characters', { data, page_index:0 })
    } catch (error) {
        console.log(error);
    }
});

app.get('/search/characters', async (req, res) => { //DONE
    try{
        //res.render('character_search');
        console.log(req.query.character_name)
        const connection = await oracledb.getConnection(dbConfig);
        const anime_query_activation = (req.query.anime != '') ? true : false;
        const manga_query_activation = (req.query.manga != '') ? true : false;
        const anime_query = (req.query.anime != '') ? `AND (LOWER(A.TITLE_ENGLISH) LIKE '%${req.query.anime.toLowerCase()}%' OR LOWER(A.TITLE_NATIVE) LIKE '%${req.query.anime.toLowerCase()}%')` : '';
        const manga_query = (req.query.manga != '') ? `AND (LOWER(M.TITLE_ENGLISH) LIKE '%${req.query.manga.toLowerCase()}%' OR LOWER(M.TITLE_NATIVE) LIKE '%${req.query.manga.toLowerCase()}%')` : '';
        const va_query = (req.query.voice != '') ? `AND (LOWER(P.NAME) LIKE '%${req.query.voice.toLowerCase()}%')` : '';
        const va_query_activation = (req.query.voice != '') ? true : false;
        const result = await connection.execute(
            `WITH C_S AS (
                SELECT C.CHARACTER_UID, C.FIRST_NAME, C.LAST_NAME, C.IMAGE_LINK
                FROM CHARACTERS C
                WHERE LOWER(C.FIRST_NAME || ' ' || C.LAST_NAME) LIKE '%${req.query.character_name}%'
                      OR EDIT_DISTANCE_MAIN(LOWER(C.FIRST_NAME), '${req.query.character_name.toLowerCase()}') <= 1
                      OR EDIT_DISTANCE_MAIN(LOWER(C.LAST_NAME), '${req.query.character_name.toLowerCase()}') <= 1
            )
            SELECT C.CHARACTER_UID, C.FIRST_NAME, C.LAST_NAME, C.IMAGE_LINK FROM C_S C 
            ${anime_query_activation ? `FULL JOIN CHARACTERS_X_ANIME CXA ON C.CHARACTER_UID = CXA.CHARACTER_UID
                                        FULL JOIN ANIME A ON CXA.ANIME_ID = A.ANIME_ID` : ''}
            ${manga_query_activation ? `FULL JOIN CHARACTERS_X_MANGA CXM ON C.CHARACTER_UID = CXM.CHARACTER_UID
                                        FULL JOIN MANGA M ON CXM.MANGA_ID = M.MANGA_ID` : ''}
            ${va_query_activation ? `FULL JOIN VOICE_ARTIST VA ON C.CHARACTER_UID = VA.CHARACTER_UID
                                     FULL JOIN PERSON P ON P.PERSON_UID = VA.PERSON_UID` : ''}
            WHERE C.CHARACTER_UID IS NOT NULL
            ${anime_query}
            ${manga_query}
            ${va_query}
            GROUP BY C.CHARACTER_UID, C.FIRST_NAME, C.LAST_NAME, C.IMAGE_LINK
            OFFSET ${Number(req.query.page_index)*50} ROWS FETCH NEXT 50 ROWS ONLY
            `
        )
        if(loggedin.length !==0 ){
            //const logger = await connection.execute(`INSERT INTO SEARCH_HISTORY (USER_ID, SEARCH_TERM) VALUES (${loggedin[0][0]}, '${req.query.title}')`);
            const logger = await connection.execute(`CALL FPT_LOG_INSERT(${loggedin[0][0]}, 'FUNCTION', 'EDIT_DISTANCE_MAIN', 'SEARCH_CHARACTERS', '${req.query.title}')`);
        } else {
            const logger = await connection.execute(`CALL FPT_LOG_INSERT(NULL, 'FUNCTION', 'EDIT_DISTANCE_MAIN', 'SEARCH_CHARACTERS', '${req.query.title}')`);
        }
        const data = result.rows;
        await connection.close();
        res.render('character_search', { data, page_index:Number(req.query.page_index)+1, character_name: req.query.character_name, 
            anime: req.query.anime, manga: req.query.manga, voice: req.query.voice });
    } catch (error) {
        console.log(error);
    }
});

app.get('/admin/add/character', async (req, res) => {
    try{
        res.render('character_add');
    } catch (error) {
        console.log(error);
    }
});
cpUpload = upload.fields([{ name: 'image_link', maxCount: 1 }])
app.post('/admin/add/character', cpUpload, async (req, res) => {
    try {
        const connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(`INSERT INTO CHARACTERS (CHARACTER_UID, FIRST_NAME, LAST_NAME, ROLE_PLAY, DESCRIPTION, IMAGE_LINK)
                                                VALUES (CHARACTER_ID_SEQ.NEXTVAL, :first_name, :last_name, :role_play, :description, :image_link)`,
                                                {
                                                    first_name: req.body.first_name,
                                                    last_name: req.body.last_name,
                                                    role_play: req.body.role_play,
                                                    description: req.body.description,
                                                    image_link: (req.files['image_link'] == undefined)? '': 'http://localhost:3000/'+req.files['image_link'][0].path.substring(7)
                                                });
        await connection.commit(); 
        await connection.close();
        res.redirect('/admin/add/character');
    } catch (error) {
        console.log(error);
    }
});

app.get('/admin/add/person', async (req, res) => {
    try{
        res.render('admin_add_person');
    } catch (error) {
        console.log(error);
    }
});
cpUpload = upload.fields([{ name: 'image_link', maxCount: 1 }])
app.post('/admin/add/person', cpUpload, async (req, res) => {
    try {
        const connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(`INSERT INTO PERSON (PERSON_UID, NAME, GENDER, IMAGE_LINK)
                                                VALUES (PERSON_UID_SEQ.NEXTVAL, :name, :gender, :image_link)`,
                                                {
                                                    name: req.body.name,
                                                    gender: req.body.gender,
                                                    image_link: (req.files['image_link'] == undefined)? '': 'http://localhost:3000/'+req.files['image_link'][0].path.substring(7)
                                                });
        await connection.commit(); 
        await connection.close();
        res.redirect('/admin/add/person');
    } catch (error) {
        console.log(error);
    }
});

app.get('/admin/add/studio', async (req, res) => {
    try{
        res.render('admin_studio_add');
    } catch (error) {
        console.log(error);
    }
});
var cpUpload = upload.fields([{ name: 'image_link', maxCount: 1 }])
app.post('/admin/add/studio', cpUpload, async (req, res) => {
    try {
        const connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(`INSERT INTO STUDIO (STUDIO_UID, NAME, ESTABLISHED, ABOUT, IMAGE_LINK)
        VALUES (STUDIO_UID_SEQ.NEXTVAL, :name, TO_DATE(:established, 'YYYY-MM-DD'), :about, :image_link)`,
        {
            name: req.body.studio_name,
            established: req.body.established_date,
            about: req.body.about,
            image_link: (req.files['image_link'] === undefined)? '': 'http://localhost:3000/'+req.files['image_link'][0].path.substring(7)
        });
        await connection.commit();
        await connection.close();
        res.redirect('/admin/add/studio');
    } catch (error) {
        console.log(error);
    }
});

app.get('/anime/:anime_id/add/character', async (req, res) => {
    // if(loggedin.length == 0){
    //     res.redirect('/');

    // } else {
    //     if (Number(loggedin[0][0]) !== 3010 || Number(loggedin[0][0]) !== 3002){
    //         res.redirect('/');
    //     }
    // }
    try {
        const connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(`SELECT CHARACTER_UID, FIRST_NAME, LAST_NAME, IMAGE_LINK FROM CHARACTERS FETCH FIRST 50 ROWS ONLY`);
        const characters = result.rows;
        await connection.close();
        res.render('character_add_search', { data:result.rows, anime_id: req.params.anime_id });
    } catch (error) {
        console.log(error);
    }
});
app.get('/anime/:anime_id/add/character/search', async (req, res) => { //DONE
    try{
        //res.render('character_search');
        console.log(req.query.character_name)
        const connection = await oracledb.getConnection(dbConfig);
        const anime_query_activation = (req.query.anime != '') ? true : false;
        const manga_query_activation = (req.query.manga != '') ? true : false;
        const anime_query = (req.query.anime != '') ? `AND (LOWER(A.TITLE_ENGLISH) LIKE '%${req.query.anime.toLowerCase()}%' OR LOWER(A.TITLE_NATIVE) LIKE '%${req.query.anime.toLowerCase()}%')` : '';
        const manga_query = (req.query.manga != '') ? `AND (LOWER(M.TITLE_ENGLISH) LIKE '%${req.query.manga.toLowerCase()}%' OR LOWER(M.TITLE_NATIVE) LIKE '%${req.query.manga.toLowerCase()}%')` : '';
        const va_query = (req.query.voice != '') ? `AND (LOWER(P.NAME) LIKE '%${req.query.voice.toLowerCase()}%')` : '';
        const va_query_activation = (req.query.voice != '') ? true : false;
        const result = await connection.execute(
            `WITH C_S AS (
                SELECT C.CHARACTER_UID, C.FIRST_NAME, C.LAST_NAME, C.IMAGE_LINK
                FROM CHARACTERS C
                WHERE LOWER(C.FIRST_NAME || ' ' || C.LAST_NAME) LIKE '%${req.query.character_name}%'
                      OR EDIT_DISTANCE_MAIN(LOWER(C.FIRST_NAME), '${req.query.character_name.toLowerCase()}') <= 1
                      OR EDIT_DISTANCE_MAIN(LOWER(C.LAST_NAME), '${req.query.character_name.toLowerCase()}') <= 1
            )
            SELECT C.CHARACTER_UID, C.FIRST_NAME, C.LAST_NAME, C.IMAGE_LINK FROM C_S C 
            ${anime_query_activation ? `FULL JOIN CHARACTERS_X_ANIME CXA ON C.CHARACTER_UID = CXA.CHARACTER_UID
                                        FULL JOIN ANIME A ON CXA.ANIME_ID = A.ANIME_ID` : ''}
            ${manga_query_activation ? `FULL JOIN CHARACTERS_X_MANGA CXM ON C.CHARACTER_UID = CXM.CHARACTER_UID
                                        FULL JOIN MANGA M ON CXM.MANGA_ID = M.MANGA_ID` : ''}
            ${va_query_activation ? `FULL JOIN VOICE_ARTIST VA ON C.CHARACTER_UID = VA.CHARACTER_UID
                                     FULL JOIN PERSON P ON P.PERSON_UID = VA.PERSON_UID` : ''}
            WHERE C.CHARACTER_UID IS NOT NULL
            ${anime_query}
            ${manga_query}
            ${va_query}
            GROUP BY C.CHARACTER_UID, C.FIRST_NAME, C.LAST_NAME, C.IMAGE_LINK
            `
        )
        if(loggedin.length !==0 ){
            //const logger = await connection.execute(`INSERT INTO SEARCH_HISTORY (USER_ID, SEARCH_TERM) VALUES (${loggedin[0][0]}, '${req.query.title}')`);
            const logger = await connection.execute(`CALL FPT_LOG_INSERT(${loggedin[0][0]}, 'FUNCTION', 'EDIT_DISTANCE_MAIN', 'SEARCH_CHARACTERS', '${req.query.title}')`);
        } else {
            const logger = await connection.execute(`CALL FPT_LOG_INSERT(NULL, 'FUNCTION', 'EDIT_DISTANCE_MAIN', 'SEARCH_CHARACTERS', '${req.query.title}')`);
        }
        const data = result.rows;
        await connection.close();
        res.render('character_add_search', { data, anime_id: req.params.anime_id });
    } catch (error) {
        console.log(error);
    }
});
app.get('/anime/:anime_id/add/character/:character_uid', async (req, res) => {
    try {
        const connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(`INSERT INTO CHARACTERS_X_ANIME (CHARACTER_UID, ANIME_ID) VALUES (:character_uid, :anime_id)`,
                                                {
                                                    character_uid: req.params.character_uid,
                                                    anime_id: req.params.anime_id
                                                });
        await connection.commit();
        await connection.close();
        res.redirect(`/anime/${req.params.anime_id}`);
    } catch (error) {
        console.log(error);
    }
});

app.get('/manga/:manga_id/add/character', async (req, res) => {
    // if(loggedin.length == 0){
    //     res.redirect('/');

    // } else {
    //     if (Number(loggedin[0][0]) !== 3010 || Number(loggedin[0][0]) !== 3002){
    //         res.redirect('/');
    //     }
    // }
    try {
        const connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(`SELECT * FROM CHARACTERS FETCH FIRST 50 ROWS ONLY`);
        const characters = result.rows;
        await connection.close();
        res.render('character_add_search_manga', { data:result.rows, manga_id: req.params.manga_id });
    } catch (error) {
        console.log(error);
    }
});
app.get('/manga/:manga_id/add/character/search', async (req, res) => { //DONE
    try{
        //res.render('character_search');
        console.log(req.query.character_name)
        const connection = await oracledb.getConnection(dbConfig);
        const anime_query_activation = (req.query.anime != '') ? true : false;
        const manga_query_activation = (req.query.manga != '') ? true : false;
        const anime_query = (req.query.anime != '') ? `AND (LOWER(A.TITLE_ENGLISH) LIKE '%${req.query.anime.toLowerCase()}%' OR LOWER(A.TITLE_NATIVE) LIKE '%${req.query.anime.toLowerCase()}%')` : '';
        const manga_query = (req.query.manga != '') ? `AND (LOWER(M.TITLE_ENGLISH) LIKE '%${req.query.manga.toLowerCase()}%' OR LOWER(M.TITLE_NATIVE) LIKE '%${req.query.manga.toLowerCase()}%')` : '';
        const va_query = (req.query.voice != '') ? `AND (LOWER(P.NAME) LIKE '%${req.query.voice.toLowerCase()}%')` : '';
        const va_query_activation = (req.query.voice != '') ? true : false;
        const result = await connection.execute(
            `WITH C_S AS (
                SELECT C.CHARACTER_UID, C.FIRST_NAME, C.LAST_NAME, C.IMAGE_LINK
                FROM CHARACTERS C
                WHERE LOWER(C.FIRST_NAME || ' ' || C.LAST_NAME) LIKE '%${req.query.character_name}%'
                      OR EDIT_DISTANCE_MAIN(LOWER(C.FIRST_NAME), '${req.query.character_name.toLowerCase()}') <= 1
                      OR EDIT_DISTANCE_MAIN(LOWER(C.LAST_NAME), '${req.query.character_name.toLowerCase()}') <= 1
            )
            SELECT C.CHARACTER_UID, C.FIRST_NAME, C.LAST_NAME, C.IMAGE_LINK FROM C_S C 
            ${anime_query_activation ? `FULL JOIN CHARACTERS_X_ANIME CXA ON C.CHARACTER_UID = CXA.CHARACTER_UID
                                        FULL JOIN ANIME A ON CXA.ANIME_ID = A.ANIME_ID` : ''}
            ${manga_query_activation ? `FULL JOIN CHARACTERS_X_MANGA CXM ON C.CHARACTER_UID = CXM.CHARACTER_UID
                                        FULL JOIN MANGA M ON CXM.MANGA_ID = M.MANGA_ID` : ''}
            ${va_query_activation ? `FULL JOIN VOICE_ARTIST VA ON C.CHARACTER_UID = VA.CHARACTER_UID
                                     FULL JOIN PERSON P ON P.PERSON_UID = VA.PERSON_UID` : ''}
            WHERE C.CHARACTER_UID IS NOT NULL
            ${anime_query}
            ${manga_query}
            ${va_query}
            GROUP BY C.CHARACTER_UID, C.FIRST_NAME, C.LAST_NAME, C.IMAGE_LINK
            `
        )
        if(loggedin.length !==0 ){
            //const logger = await connection.execute(`INSERT INTO SEARCH_HISTORY (USER_ID, SEARCH_TERM) VALUES (${loggedin[0][0]}, '${req.query.title}')`);
            const logger = await connection.execute(`CALL FPT_LOG_INSERT(${loggedin[0][0]}, 'FUNCTION', 'EDIT_DISTANCE_MAIN', 'SEARCH_CHARACTERS', '${req.query.title}')`);
        } else {
            const logger = await connection.execute(`CALL FPT_LOG_INSERT(NULL, 'FUNCTION', 'EDIT_DISTANCE_MAIN', 'SEARCH_CHARACTERS', '${req.query.title}')`);
        }
        const data = result.rows;
        await connection.close();
        res.render('character_add_search_manga', { data, manga_id: req.params.manga_id });
    } catch (error) {
        console.log(error);
    }
});
app.get('/manga/:manga_id/add/character/:character_uid', async (req, res) => {
    try {
        const connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(`INSERT INTO CHARACTERS_X_MANGA (CHARACTER_UID, MANGA_ID) VALUES (:character_uid, :manga_id)`,
                                                {
                                                    character_uid: req.params.character_uid,
                                                    manga_id: req.params.manga_id
                                                });
        await connection.commit();
        await connection.close();
        res.redirect(`/manga/${req.params.manga_id}`);
    } catch (error) {
        console.log(error);
    }
});



app.post('/anime/:anime_id/add/character', async (req, res) => {
    try{
        const connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(`INSERT INTO CHARACTERS (CHARACTER_UID, FIRST_NAME, LAST_NAME, ROLE_PLAY, DESCRIPTION, IMAGE_LINK) 
                                                VALUES (CHARACTER_ID_SEQ.NEXTVAL, :first_name, :last_name, :role_play, :description, :image_link)`, 
                                                {
                                                    first_name: req.body.first_name,
                                                    last_name: req.body.last_name,
                                                    image_link: req.body.image_link,
                                                    role_play: req.body.role_play,
                                                    description: req.body.description
                                                });
        const character_uid_fetch = await connection.execute(`SELECT CHARACTER_ID_SEQ.CURRVAL FROM DUAL`);
        // console.log(character_uid_fetch.rows[0][0]);
        const result2 = await connection.execute(`INSERT INTO CHARACTERS_X_ANIME (CHARACTER_UID, ANIME_ID) VALUES (:character_uid, :anime_id)`,
                                                {
                                                    character_uid: character_uid_fetch.rows[0][0],
                                                    anime_id: req.params.anime_id
                                                });
        await connection.commit();
        await connection.close();
        res.redirect(`/anime/${req.params.anime_id}`);
    } catch (error){
        console.log(error);
    }
});

app.get('/anime/:anime_id/delete/character/:character_uid', async (req, res) => {
    try {
        const connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(`DELETE FROM CHARACTERS_X_ANIME WHERE ANIME_ID = ${req.params.anime_id} AND CHARACTER_UID = ${req.params.character_uid}`);
        await connection.commit();
        await connection.close();
        res.redirect('/anime/'+req.params.anime_id+'/edit');
    } catch (error) {
        console.log(error);
    }
});

app.get("/anime/:anime_id/add/manga", async(req, res)=>{
    try {
        const connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(`SELECT MANGA_ID, TITLE_ENGLISH, TITLE_NATIVE, COVER_IMAGE FROM MANGA
                                                 WHERE ISADULT = 'NO'
                                                 ORDER BY manga_id FETCH FIRST 50 ROWS ONLY`);
        const data = result.rows;
        const country_of_origin_t = await connection.execute(`SELECT COUNTRY_OF_ORIGIN FROM MANGA GROUP BY COUNTRY_OF_ORIGIN ORDER BY COUNTRY_OF_ORIGIN`);
        const country_of_origin = country_of_origin_t.rows;
        const year_t = await connection.execute(`SELECT EXTRACT(YEAR FROM START_DATE) AS START_YEAR 
        FROM MANGA GROUP BY EXTRACT(YEAR FROM START_DATE) ORDER BY EXTRACT(YEAR FROM START_DATE) DESC`);
        const year = year_t.rows;
        await connection.close();
        console.log(loggedin)
        //console.log(data)
        //console.log(data.length)
        res.render('manga_add_over_anime', { data, country_of_origin, year, page_index: 0, anime_id: req.params.anime_id });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Internal Server Error');
    }
});

app.get("/anime/:anime_id/add/manga/search", async(req, res)=>{ //DONE
    try {
        const connection = await oracledb.getConnection(dbConfig);
        const title_query_activation = (req.query.title != '') ? true : false;
        const title_query = (req.query.title != '') ? `(LOWER(M.TITLE_ENGLISH) LIKE '%${req.query.title.toLowerCase()}%' OR LOWER(M.TITLE_NATIVE) LIKE '%${req.query.title.toLowerCase()}%' OR EDIT_DISTANCE_MAIN(LOWER(M.TITLE_ENGLISH), '${req.query.title.toLowerCase()}') <= 2)` : '';
        const genre_query_activation = (req.query.genre != '') ? true : false;
        const genre_query = (req.query.genre != '') ? `AND (LOWER(MG.TYPE_NAME) LIKE '%${req.query.genre.toLowerCase()}%')` : '';
        const character_query = (req.query.character != '') ? `AND (LOWER(C.FIRST_NAME || ' ' || C.LAST_NAME) LIKE '%${req.query.character.toLowerCase()}%')` : '';
        const character_query_activation = (req.query.character != '') ? true : false;
        const author_query_activation = (req.query.author != '') ? true : false;
        const author_query = (req.query.author != '') ? `AND LOWER(P.NAME) LIKE '%${req.query.author.toLowerCase()}%'` : '';
        const year_query = (req.query.year != 0) ? `AND (EXTRACT(YEAR FROM M.START_DATE) <= ${Number(req.query.year)}
        AND (EXTRACT(YEAR FROM M.END_DATE) >= ${Number(req.query.year)} OR M.END_DATE IS NULL))` : ``;
        const status_query = (req.query.status != '') ? `AND (LOWER(M.STATUS) LIKE '%${req.query.status.toLowerCase()}%')` : '';
        const country_query = (req.query.country != '') ? `AND (LOWER(M.COUNTRY_OF_ORIGIN) LIKE '%${req.query.country.toLowerCase()}%')` : '';
        const result = await connection.execute(`
            WITH M_S AS
            (
                SELECT * FROM MANGA M WHERE (LOWER(M.TITLE_ENGLISH) LIKE '%${req.query.title.toLowerCase()}%' OR LOWER(M.TITLE_NATIVE) LIKE '%${req.query.title.toLowerCase()}%' OR EDIT_DISTANCE_MAIN(LOWER(M.TITLE_ENGLISH), '${req.query.title.toLowerCase()}') <= 2)
                                            ` + status_query + country_query
                                            + year_query + `
            )
            SELECT M.MANGA_ID, M.TITLE_ENGLISH, M.TITLE_NATIVE, M.COVER_IMAGE 
            FROM M_S M ${genre_query_activation ? `FULL JOIN MANGA_X_GENRE MXG ON M.MANGA_ID = MXG.MANGA_ID
                                                    FULL JOIN MANGA_GENRE MG ON MXG.GENRE_UID = MG.GENRE_UID` : ''} 
            ${character_query_activation ? `FULL JOIN CHARACTERS_X_MANGA CXM ON CXM.MANGA_ID = M.MANGA_ID
                                            FULL JOIN CHARACTERS C ON C.CHARACTER_UID = CXM.CHARACTER_UID` : ''}
            ${author_query_activation ? `FULL JOIN AUTHOR_X_MANGA AXM ON AXM.MANGA_ID = M.MANGA_ID
                                        FULL JOIN PERSON P ON P.PERSON_UID = AXM.PERSON_UID` : ''}
            WHERE M.MANGA_ID IS NOT NULL 
            ${genre_query}
            ${character_query}
            ${author_query}
            GROUP BY M.MANGA_ID, M.TITLE_ENGLISH, M.TITLE_NATIVE, M.COVER_IMAGE
            OFFSET ${Number(req.query.page_index)*50} ROWS FETCH NEXT 50 ROWS ONLY
        `);
        if(loggedin.length !==0 ){
            //const logger = await connection.execute(`INSERT INTO SEARCH_HISTORY (USER_ID, SEARCH_TERM) VALUES (${loggedin[0][0]}, '${req.query.title}')`);
            const logger = await connection.execute(`CALL FPT_LOG_INSERT(${loggedin[0][0]}, 'FUNCTION', 'EDIT_DISTANCE_MAIN', 'SEARCH_MANGA', '${req.query.title}')`);
        } else {
            const logger = await connection.execute(`CALL FPT_LOG_INSERT(NULL, 'FUNCTION', 'EDIT_DISTANCE_MAIN', 'SEARCH_MANGA', '${req.query.title}')`);
        }

        const data = result.rows;
        const country_of_origin_t = await connection.execute(`SELECT COUNTRY_OF_ORIGIN FROM MANGA GROUP BY COUNTRY_OF_ORIGIN ORDER BY COUNTRY_OF_ORIGIN`);
        const country_of_origin = country_of_origin_t.rows;
        const year_t = await connection.execute(`SELECT EXTRACT(YEAR FROM START_DATE) AS START_YEAR 
                                                FROM ANIME GROUP BY EXTRACT(YEAR FROM START_DATE) ORDER BY EXTRACT(YEAR FROM START_DATE) DESC`);
        const year = year_t.rows;
        //console.log(country_of_origin);
        await connection.close();
        console.log(loggedin)
        //console.log(data)
        //console.log(data.length)
        res.render('manga_add_over_anime_search', { data, country_of_origin, year, title_s:req.query.title, genre_s:req.query.genre, 
            character_s:req.query.character, author_s:req.query.author, year_s:req.query.year, status_s:req.query.status, 
            country_s:req.query.country, page_index: Number(req.query.page_index)+1 , anime_id: req.params.anime_id});
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Internal Server Error');
    }
});
app.get('/anime/:anime_id/add/manga/:manga_id', async (req, res) => {
    try {
        const connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(`INSERT INTO ANIME_X_MANGA(ANIME_ID, MANGA_ID) VALUES (:anime_id, :manga_id)`,
                                                {
                                                    anime_id: req.params.anime_id,
                                                    manga_id: req.params.manga_id
                                                });
        await connection.commit();
        await connection.close();
        res.redirect(`/anime/${req.params.anime_id}`);
    } catch (error) {
        console.log(error);
    }
});

app.get('/character/:character_uid/add/anime', async (req, res) => {
    try {
        const connection = await oracledb.getConnection(dbConfig);
        const year_t = await connection.execute(`SELECT EXTRACT(YEAR FROM START_DATE) AS START_YEAR 
            FROM ANIME GROUP BY EXTRACT(YEAR FROM START_DATE) ORDER BY EXTRACT(YEAR FROM START_DATE) DESC`);
        const year = year_t.rows;

        const country_of_origin_t = await connection.execute(`SELECT COUNTRY_OF_ORIGIN FROM ANIME GROUP BY COUNTRY_OF_ORIGIN ORDER BY COUNTRY_OF_ORIGIN`);
        const country_of_origin = country_of_origin_t.rows;
        const nsfw_stat = (loggedin.length === 0)? `'NO'` : `USER_NSFW_STATUS(${loggedin[0][0]})`;
        const result = await connection.execute(`SELECT ANIME_ID, TITLE_ENGLISH, TITLE_NATIVE, COVER_IMAGE, ISADULT FROM ANIME WHERE ISADULT LIKE ` +nsfw_stat+  `ORDER BY VISIT_COUNT DESC FETCH FIRST 50 ROWS ONLY`);
        if(loggedin.length !==0 ){
            const logger = await connection.execute(`CALL FPT_LOG_INSERT(${loggedin[0][0]}, 'FUNCTION', 'USER_NSFW_STATUS', 'HOME', '${loggedin[0][0]}')`);
        }
        const data = result.rows;
        await connection.close();
        console.log(loggedin)
        //console.log(data)
        //console.log(data.length)
        res.render('add_anime_over_character', { data, year, country_of_origin, page_index: 0 , character_uid: req.params.character_uid});
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/character/:character_uid/add/anime/search', async (req, res) => { 
    console.log(req.query.title.toLowerCase());
    // console.log('Search term post:', searchAnime);
    // const searchLower = searchAnime.toLowerCase();
    try {
        const connection = await oracledb.getConnection(dbConfig);
        const year_t = await connection.execute(`SELECT EXTRACT(YEAR FROM START_DATE) AS START_YEAR 
            FROM ANIME GROUP BY EXTRACT(YEAR FROM START_DATE) ORDER BY EXTRACT(YEAR FROM START_DATE) DESC`);
        const year = year_t.rows;

        const country_of_origin_t = await connection.execute(`SELECT COUNTRY_OF_ORIGIN FROM ANIME GROUP BY COUNTRY_OF_ORIGIN ORDER BY COUNTRY_OF_ORIGIN`);
        const country_of_origin = country_of_origin_t.rows;

        // const result = await connection.execute(`SELECT ANIME_ID, TITLE_ENGLISH, TITLE_NATIVE, COVER_IMAGE FROM ANIME
        //  WHERE LOWER(TITLE_ENGLISH) LIKE '%${searchLower}%' OR LOWER(TITLE_NATIVE) LIKE '%${searchLower}%'`);
        // const data = result.rows;
        //console.log(req.query.title, req.query.year, req.query.country, req.query.genre, req.query.characters, req.query.studio.toLowerCase())
        console.log(req.query.page_index)
        const year_query = (req.query.year != 0) ? `AND (EXTRACT(YEAR FROM A.START_DATE) <= ${Number(req.query.year)}
        AND (EXTRACT(YEAR FROM A.END_DATE) >= ${Number(req.query.year)} OR A.END_DATE IS NULL))` : ``;

        const manga_adapted_query = (req.query.manga_adapted == 'on') ? `AND A.ANIME_ID IN (SELECT ANIME_ID FROM ANIME_X_MANGA)` : '';
        const studio_query = (req.query.studio != '') ? `AND (LOWER(S.NAME) LIKE '%${req.query.studio.toLowerCase()}%')` : '';
        const character_query = (req.query.characters != '') ? `AND (LOWER(C.FIRST_NAME || ' ' || C.LAST_NAME) LIKE '%${req.query.characters.toLowerCase()}%')` : '';
        const nsfw_stat = (loggedin.length === 0)? `'NO'` : `USER_NSFW_STATUS(${loggedin[0][0]})`;
        const country_query = (req.query.country != '') ? `AND A.COUNTRY_OF_ORIGIN LIKE '%${req.query.country}%'` : '';
        const status_query = (req.query.status != '') ? `AND A.STATUS LIKE '%${req.query.status.toUpperCase()}%'` : '';
        const genre_query = (req.query.genre != '') ? `AND (LOWER(AG.TYPE_NAME) LIKE '%${req.query.genre.toLowerCase()}%')` : '';
        const search_t = await connection.execute(
            `
            WITH A_S AS
            (SELECT * FROM ANIME A WHERE ( (LOWER(A.TITLE_ENGLISH) LIKE '%' || :title || '%') OR EDIT_DISTANCE_MAIN(LOWER(A.TITLE_ENGLISH), '${req.query.title.toLowerCase()}') <= 2)`
                                                                    +country_query + status_query
                                                                    + year_query + `
            )
            SELECT A.ANIME_ID, A.TITLE_ENGLISH, A.TITLE_NATIVE, A.COVER_IMAGE, A.ISADULT
                FROM A_S A FULL JOIN ANIME_X_GENRE AXG ON A.ANIME_ID = AXG.ANIME_ID
                        FULL JOIN CHARACTERS_X_ANIME CXA ON CXA.ANIME_ID = A.ANIME_ID 
						FULL JOIN CHARACTERS C ON CXA.CHARACTER_UID = C.CHARACTER_UID
                        FULL JOIN ANIME_GENRE AG ON AG.GENRE_UID = AXG.GENRE_UID
                        FULL JOIN ANIME_X_MANGA AXM ON AXM.ANIME_ID = A.ANIME_ID
                        FULL JOIN STUDIO_X_ANIME SXA ON SXA.ANIME_ID = A.ANIME_ID
                        FULL JOIN STUDIO S ON S.STUDIO_UID = SXA.STUDIO_UID
                WHERE ISADULT LIKE `+nsfw_stat+`
                ` + genre_query
                + manga_adapted_query + studio_query + character_query +
            `GROUP BY A.ANIME_ID, A.TITLE_ENGLISH, A.TITLE_NATIVE, A.COVER_IMAGE, A.ISADULT
            OFFSET ${Number(req.query.page_index)*50} ROWS FETCH NEXT 50 ROWS ONLY
            `,
            {
                title: req.query.title.toLowerCase()
            }
        );
        if(loggedin.length !==0 ){
            //const logger = await connection.execute(`INSERT INTO SEARCH_HISTORY (USER_ID, SEARCH_TERM) VALUES (${loggedin[0][0]}, '${req.query.title}')`);
            const logger = await connection.execute(`CALL FPT_LOG_INSERT(${loggedin[0][0]}, 'FUNCTION', 'EDIT_DISTANCE_MAIN', 'SEARCH_ANIME', '${req.query.title}')`);
            const logger2 = await connection.execute(`CALL FPT_LOG_INSERT(${loggedin[0][0]}, 'FUNCTION', 'USER_NSFW_STATUS', 'SEARCH_FILTER', '${loggedin[0][0]}')`);
        } else {
            const logger = await connection.execute(`CALL FPT_LOG_INSERT(NULL, 'FUNCTION', 'EDIT_DISTANCE_MAIN', 'SEARCH_ANIME', '${req.query.title}')`);
        }
        const data = search_t.rows;
        //console.log(data)
        // const anime_complex = search_t.rows;
        // //console.log(anime_complex[0])
        // console.log(req.query.title, req.query.year, req.query.country, req.query.genre, req.query.characters, req.query.studio, req.query.staff)
        console.log(req.query.manga_adapted);
        await connection.close();
        res.render('add_anime_over_character_search', {data, year, country_of_origin, page_index: Number(req.query.page_index)+1, title: req.query.title, year_s: req.query.year, 
            country_s: req.query.country, status_s: req.query.status, manga_adapted_s: req.query.manga_adapted, genre_s: req.query.genre,
            characters_s: req.query.characters, studio_s: req.query.studio, character_uid: req.params.character_uid});
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Internal Server Error');
    }
});


app.get('/character/:character_uid/add/anime/:anime_id', async (req, res) => {
    try {
        const connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(`INSERT INTO CHARACTERS_X_ANIME(CHARACTER_UID, ANIME_ID) VALUES (:character_uid, :anime_id)`,
                                                {
                                                    character_uid: req.params.character_uid,
                                                    anime_id: req.params.anime_id
                                                });
        await connection.commit();
        await connection.close();
        res.redirect(`/character/${req.params.character_uid}`);
    } catch (error) {
        console.log(error);
    }
});
app.get('/character/:character_uid/add/manga/:manga_id', async (req, res) => {
    try {
        const connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(`INSERT INTO CHARACTERS_X_MANGA(CHARACTER_UID, MANGA_ID) VALUES (:character_uid, :manga_id)`,
                                                {
                                                    character_uid: req.params.character_uid,
                                                    manga_id: req.params.manga_id
                                                });
        await connection.commit();
        await connection.close();
        res.redirect(`/character/${req.params.character_uid}`);
    } catch (error) {
        console.log(error);
    }
});

app.get('/character/:character_uid/add/manga', async (req, res) => {
    try {
        const connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(`SELECT MANGA_ID, TITLE_ENGLISH, TITLE_NATIVE, COVER_IMAGE FROM MANGA
                                                 WHERE ISADULT = 'NO'
                                                 ORDER BY manga_id FETCH FIRST 50 ROWS ONLY`);
        const data = result.rows;
        const country_of_origin_t = await connection.execute(`SELECT COUNTRY_OF_ORIGIN FROM MANGA GROUP BY COUNTRY_OF_ORIGIN ORDER BY COUNTRY_OF_ORIGIN`);
        const country_of_origin = country_of_origin_t.rows;
        const year_t = await connection.execute(`SELECT EXTRACT(YEAR FROM START_DATE) AS START_YEAR 
        FROM MANGA GROUP BY EXTRACT(YEAR FROM START_DATE) ORDER BY EXTRACT(YEAR FROM START_DATE) DESC`);
        const year = year_t.rows;
        await connection.close();
        console.log(loggedin)
        //console.log(data)
        //console.log(data.length)
        res.render('add_manga_over_character', { data, country_of_origin, year, page_index: 0, character_uid: req.params.character_uid });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/character/:character_uid/add/manga/search', async (req, res) => {
    try {
        const connection = await oracledb.getConnection(dbConfig);
        const title_query_activation = (req.query.title != '') ? true : false;
        const title_query = (req.query.title != '') ? `(LOWER(M.TITLE_ENGLISH) LIKE '%${req.query.title.toLowerCase()}%' OR LOWER(M.TITLE_NATIVE) LIKE '%${req.query.title.toLowerCase()}%' OR EDIT_DISTANCE_MAIN(LOWER(M.TITLE_ENGLISH), '${req.query.title.toLowerCase()}') <= 2)` : '';
        const genre_query_activation = (req.query.genre != '') ? true : false;
        const genre_query = (req.query.genre != '') ? `AND (LOWER(MG.TYPE_NAME) LIKE '%${req.query.genre.toLowerCase()}%')` : '';
        const character_query = (req.query.character != '') ? `AND (LOWER(C.FIRST_NAME || ' ' || C.LAST_NAME) LIKE '%${req.query.character.toLowerCase()}%')` : '';
        const character_query_activation = (req.query.character != '') ? true : false;
        const author_query_activation = (req.query.author != '') ? true : false;
        const author_query = (req.query.author != '') ? `AND LOWER(P.NAME) LIKE '%${req.query.author.toLowerCase()}%'` : '';
        const year_query = (req.query.year != 0) ? `AND (EXTRACT(YEAR FROM M.START_DATE) <= ${Number(req.query.year)}
        AND (EXTRACT(YEAR FROM M.END_DATE) >= ${Number(req.query.year)} OR M.END_DATE IS NULL))` : ``;
        const status_query = (req.query.status != '') ? `AND (LOWER(M.STATUS) LIKE '%${req.query.status.toLowerCase()}%')` : '';
        const country_query = (req.query.country != '') ? `AND (LOWER(M.COUNTRY_OF_ORIGIN) LIKE '%${req.query.country.toLowerCase()}%')` : '';
        const result = await connection.execute(`
            WITH M_S AS
            (
                SELECT * FROM MANGA M WHERE (LOWER(M.TITLE_ENGLISH) LIKE '%${req.query.title.toLowerCase()}%' OR LOWER(M.TITLE_NATIVE) LIKE '%${req.query.title.toLowerCase()}%' OR EDIT_DISTANCE_MAIN(LOWER(M.TITLE_ENGLISH), '${req.query.title.toLowerCase()}') <= 2)
                                            ` + status_query + country_query
                                            + year_query + `
            )
            SELECT M.MANGA_ID, M.TITLE_ENGLISH, M.TITLE_NATIVE, M.COVER_IMAGE 
            FROM M_S M ${genre_query_activation ? `FULL JOIN MANGA_X_GENRE MXG ON M.MANGA_ID = MXG.MANGA_ID
                                                    FULL JOIN MANGA_GENRE MG ON MXG.GENRE_UID = MG.GENRE_UID` : ''} 
            ${character_query_activation ? `FULL JOIN CHARACTERS_X_MANGA CXM ON CXM.MANGA_ID = M.MANGA_ID
                                            FULL JOIN CHARACTERS C ON C.CHARACTER_UID = CXM.CHARACTER_UID` : ''}
            ${author_query_activation ? `FULL JOIN AUTHOR_X_MANGA AXM ON AXM.MANGA_ID = M.MANGA_ID
                                        FULL JOIN PERSON P ON P.PERSON_UID = AXM.PERSON_UID` : ''}
            WHERE M.MANGA_ID IS NOT NULL 
            ${genre_query}
            ${character_query}
            ${author_query}
            GROUP BY M.MANGA_ID, M.TITLE_ENGLISH, M.TITLE_NATIVE, M.COVER_IMAGE
            OFFSET ${Number(req.query.page_index)*50} ROWS FETCH NEXT 50 ROWS ONLY
        `);
        if(loggedin.length !==0 ){
            //const logger = await connection.execute(`INSERT INTO SEARCH_HISTORY (USER_ID, SEARCH_TERM) VALUES (${loggedin[0][0]}, '${req.query.title}')`);
            const logger = await connection.execute(`CALL FPT_LOG_INSERT(${loggedin[0][0]}, 'FUNCTION', 'EDIT_DISTANCE_MAIN', 'SEARCH_MANGA', '${req.query.title}')`);
        } else {
            const logger = await connection.execute(`CALL FPT_LOG_INSERT(NULL, 'FUNCTION', 'EDIT_DISTANCE_MAIN', 'SEARCH_MANGA', '${req.query.title}')`);
        }

        const data = result.rows;
        const country_of_origin_t = await connection.execute(`SELECT COUNTRY_OF_ORIGIN FROM MANGA GROUP BY COUNTRY_OF_ORIGIN ORDER BY COUNTRY_OF_ORIGIN`);
        const country_of_origin = country_of_origin_t.rows;
        const year_t = await connection.execute(`SELECT EXTRACT(YEAR FROM START_DATE) AS START_YEAR 
                                                FROM ANIME GROUP BY EXTRACT(YEAR FROM START_DATE) ORDER BY EXTRACT(YEAR FROM START_DATE) DESC`);
        const year = year_t.rows;
        //console.log(country_of_origin);
        await connection.close();
        console.log(loggedin)
        //console.log(data)
        //console.log(data.length)
        res.render('add_manga_over_character_search', { data, country_of_origin, year, title_s:req.query.title, genre_s:req.query.genre, 
            character_s:req.query.character, author_s:req.query.author, year_s:req.query.year, status_s:req.query.status, 
            country_s:req.query.country, page_index: Number(req.query.page_index)+1, character_uid: req.params.character_uid});
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Internal Server Error');
    }
});

// app.get('/anime/:anime_id/add/manga', async (req, res) => {
//     // if(loggedin.length == 0){
//     //     res.redirect('/');

//     // } else {
//     //     if (Number(loggedin[0][0]) !== 3010 || Number(loggedin[0][0]) !== 3002){
//     //         res.redirect('/');
//     //     }
//     // }
//     try {
//         const connection = await oracledb.getConnection(dbConfig);
//         const manga_t = await connection.execute(`SELECT MANGA_ID, TITLE_ENGLISH FROM MANGA`);
//         const mangas = manga_t.rows;
//         await connection.close();
//         res.render('manga_add', { anime_id: req.params.anime_id, mangas_m:mangas });
//     } catch (error) {
//         console.log(error);
//     }
// });
// var cpUpload = upload.fields([{ name: 'banner_image', maxCount: 1 }, { name: 'cover_image', maxCount: 1 }])
// app.post('/anime/:anime_id/add/manga', cpUpload, async (req, res) => {
//     try{
//         const connection = await oracledb.getConnection(dbConfig);
//         const result2 = await connection.execute(`INSERT INTO ANIME_X_MANGA VALUES (:anime_id, :manga_id)`,
//                                                 {
//                                                     anime_id: req.params.anime_id,
//                                                     manga_id: req.body.manga_id[0]
//                                                 });
//         await connection.commit();
//         await connection.close();
//         res.redirect(`/anime/${req.params.anime_id}`);
//     } catch (error){
//         console.log(error);
//     }
// });
app.get('/anime/:anime_id/add/genre', async (req, res) => { //linker only
    if(loggedin.length == 0){
        res.redirect('/');
    } else {
            // if (loggedin[0][3] !== 'Admin' || loggedin[0][3] !== 'Moderator'){
            //     res.redirect('/');
            // }
    }
    const connection = await oracledb.getConnection(dbConfig);
    const genre_t = await connection.execute(`SELECT * FROM ANIME_GENRE`);
    const genre = genre_t.rows;
    await connection.close();
    res.render('genre_add_over_anime', { anime_id: req.params.anime_id, genres: genre});
});
app.post('/anime/:anime_id/add/genre', async (req, res) => {
    try {
        console.log(req.body);
        const connection = await oracledb.getConnection(dbConfig);
        if(req.body.genre !== undefined) {
            for(let i=0; i< req.body.genre.length; i++){
                const result = await connection.execute(`INSERT INTO ANIME_X_GENRE (ANIME_ID, GENRE_UID) VALUES (:anime_id, :genre)`,
                                                        {
                                                            anime_id: req.params.anime_id,
                                                            genre: req.body.genre[i]
                                                        });
            }
        }
        await connection.commit();
        await connection.close();
        res.redirect(`/anime/${req.params.anime_id}`);
    } catch (error) {
        console.log(error);
        res.send(error);
    }
    
});
app.get('/anime/:anime_id/delete/:genre_uid', async (req, res) => {
    try {
        const connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(`DELETE FROM ANIME_X_GENRE WHERE ANIME_ID = ${req.params.anime_id} AND GENRE_UID = ${req.params.genre_uid}`);
        await connection.commit();
        await connection.close();
        res.redirect(`/anime/${req.params.anime_id}/edit`);
    } catch (error) {
        console.log(error);
        res.send(error);
    }
});



app.get('/manga/:manga_id/delete/:anime_id', async (req, res) => {
    try {
        const connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(`DELETE FROM ANIME_X_MANGA WHERE ANIME_ID = ${req.params.anime_id} AND MANGA_ID = ${req.params.manga_id}`);
        await connection.commit();
        await connection.close();
        res.redirect(`/manga/${req.params.manga_id}/edit`);
    } catch (error) {
        console.log(error);
    }

});
app.get('/manga/:manga_id/delete/genre/:genre_uid', async (req, res) => {
    try {
        const connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(`DELETE FROM MANGA_X_GENRE WHERE MANGA_ID = ${req.params.manga_id} AND GENRE_UID = ${req.params.genre_uid}`);
        await connection.commit();
        await connection.close();
        res.redirect(`/manga/${req.params.manga_id}/edit`);
    } catch (error) {
        console.log(error);
        res.send(error);
    }
});
app.get('/manga/:manga_id/delete/character/:character_uid', async (req, res) => {
    try {
        const connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(`DELETE FROM CHARACTERS_X_MANGA WHERE MANGA_ID = ${req.params.manga_id} AND CHARACTER_UID = ${req.params.character_uid}`);
        await connection.commit();
        await connection.close();
        res.redirect(`/manga/${req.params.manga_id}/edit`);
    } catch (error) {
        console.log(error);
        res.send(error);
    }

});
app.get('/anime/:anime_id/add/studio', async (req, res) => {
    // if(loggedin.length == 0){
    //     res.redirect('/');
    // } else {
    //     if (loggedin[0][3] !== 'Admin' || loggedin[0][3] !== 'Moderator'){
    //         res.redirect('/');
    //     }
    // }
    const connection = await oracledb.getConnection(dbConfig);
    const studio_t = await connection.execute(`SELECT STUDIO_UID, NAME FROM STUDIO`);

    await connection.close();
    res.render('studio_add_over_anime', { anime_id: req.params.anime_id, studios_m: studio_t.rows });
});
app.post('/anime/:anime_id/add/studio', async (req, res) => {
    try {
        console.log(req.body.studio_id[0]);
        const connection = await oracledb.getConnection(dbConfig);
        // if(req.body.contribution === 'BOTH'){
        //     const result = await connection.execute(`INSERT INTO STUDIO_X_ANIME(ANIME_ID, STUDIO_UID, CONTRIBUTION) VALUES (:anime_id, :studio_id, 'PRODUCTION')`, 
        //                                         {
        //                                             anime_id: req.params.anime_id,
        //                                             studio_id: Number(req.body.studio_id[0])
        //                                         });
        //     const result2 = await connection.execute(`INSERT INTO STUDIO_X_ANIME(ANIME_ID, STUDIO_UID, CONTRIBUTION) VALUES (:anime_id, :studio_id, 'ANIMATION')`, 
        //                                         {
        //                                             anime_id: req.params.anime_id,
        //                                             studio_id: Number(req.body.studio_id[0])
        //                                         });
        // } else {
        //     const result = await connection.execute(`INSERT INTO STUDIO_X_ANIME(ANIME_ID, STUDIO_UID, CONTRIBUTION) VALUES (:anime_id, :studio_id, :contribution)`,
        //                                         {
        //                                             anime_id: req.params.anime_id,
        //                                             studio_id: Number(req.body.studio_id[0]),
        //                                             contribution: req.body.contribution
        //                                         });
        // }
        const result = await connection.execute(`CALL STUDIO_ANIME_RELATION(${req.body.studio_id[0]}, ${req.params.anime_id}, '${req.body.contribution}')`);
        try {
            if(loggedin.length !==0 ){
                //const logger = await connection.execute(`INSERT INTO SEARCH_HISTORY (USER_ID, SEARCH_TERM) VALUES (${loggedin[0][0]}, '${req.query.title}')`);
                const logger = await connection.execute(`CALL FPT_LOG_INSERT(${loggedin[0][0]}, 'PROCEDURE', 'STUDIO_ANIME_RELATION', 'CALL', 
                '${req.body.studio_id[0]}' || ' ' || '${req.params.anime_id}' || ' ' || '${req.body.contribution}'`);
            } else {
                const logger = await connection.execute(`CALL FPT_LOG_INSERT(NULL, 'PROCEDURE', 'STUDIO_ANIME_RELATION', 'CALL', 
                '${req.body.studio_id[0]}' || ' ' || '${req.params.anime_id}' || ' ' || '${req.body.contribution}'`);
            } 
        } catch (error) {
            console.log(error);
        }
        
        await connection.commit();
        await connection.close();
        res.redirect(`/anime/${req.params.anime_id}`);
    } catch (error) {
        console.log(error);
        res.send(error);
    }
});
app.get('/anime/:anime_id/delete/studio/:studio_uid', async (req, res)=>{
    try {
        const connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(`DELETE FROM STUDIO_X_ANIME WHERE ANIME_ID = ${req.params.anime_id} AND STUDIO_UID = ${req.params.studio_uid}`);
        await connection.commit();
        await connection.close();
        res.redirect(`/anime/${req.params.anime_id}/edit`);
    } catch (error) {
        console.log(error);
        res.send(error);
    }
});

app.post('/character/:character_id/delete/', async (req, res) => {
    try {
        const connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(`DELETE FROM CHARACTERS WHERE CHARACTER_UID = ${req.params.character_id}`);
        await connection.commit();
        await connection.close();
        res.redirect('/characters');
    } catch (error) {
        console.log(error);
    }
});

app.get('/xyz', async (req, res) => {
    try {
        res.render('anime_studio_add');
    } catch (error) {
        console.log(error);
    }
});
app.post('/xyz', async (req, res) => {
    try {
        console.log('printing what I need');
        console.log(req.body.first_name);
        // You can process the voice_actors array here
        res.render('anime_studio_add');
    } catch (error) {
        console.log(error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/character/:character_id', async (req, res) => {
    try {
        const connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(`SELECT * FROM CHARACTERS WHERE CHARACTER_UID = ${req.params.character_id}`);
        const data = result.rows;
        if(data.length != 1) 
            res.redirect('/');
        const voiced_by_t = await connection.execute(`SELECT P.*, VA.LANGUAGE
                                                    FROM PERSON P
                                                    JOIN (
                                                        SELECT PERSON_UID, LANGUAGE
                                                        FROM VOICE_ARTIST
                                                        WHERE CHARACTER_UID = :character_uid
                                                    ) VA ON P.PERSON_UID = VA.PERSON_UID
                                                    ORDER BY P.PERSON_UID`
                                                    , {
                                                        character_uid: req.params.character_id
                                                    });
        const appeared_in_anime = await connection.execute(`SELECT A.ANIME_ID, A.TITLE_ENGLISH, A.TITLE_NATIVE, A.COVER_IMAGE
                                                    FROM ANIME A JOIN CHARACTERS_X_ANIME CXA ON A.ANIME_ID = CXA.ANIME_ID
                                                    WHERE CXA.CHARACTER_UID = :character_uid`,
                                                    {
                                                        character_uid: req.params.character_id
                                                    });
        const appeared_in_anime_data = appeared_in_anime.rows;
        const appeared_in_manga = await connection.execute(`SELECT M.MANGA_ID, M.TITLE_ENGLISH, M.TITLE_NATIVE, M.COVER_IMAGE
                                                    FROM MANGA M JOIN CHARACTERS_X_MANGA CXM ON M.MANGA_ID = CXM.MANGA_ID
                                                    WHERE CXM.CHARACTER_UID = :character_uid`,
                                                    {
                                                        character_uid: req.params.character_id
                                                    });
        const appeared_in_manga_data = appeared_in_manga.rows;
        const per_score_count_t = await connection.execute(
            `SELECT S.RATING, COUNT(CR.RATING)  
            FROM (
                SELECT 1 AS RATING FROM DUAL UNION ALL
                SELECT 2 AS RATING FROM DUAL UNION ALL
                SELECT 3 AS RATING FROM DUAL UNION ALL
                SELECT 4 AS RATING FROM DUAL UNION ALL
                SELECT 5 AS RATING FROM DUAL 
            ) S 
            LEFT JOIN CHARACTER_RATING CR ON CR.RATING = S.RATING AND CR.CHARACTER_UID = :character_uid
            GROUP BY S.RATING
            ORDER BY NVL(S.RATING, 0) DESC`,
            {
                character_uid: req.params.character_id
            }
        )
        const avg_score_t = await connection.execute(`SELECT ROUND(AVG(RATING), 1), COUNT(*) FROM CHARACTER_RATING WHERE CHARACTER_UID = :character_uid`, {character_uid: req.params.character_id});
        var user_rating = 0;
        if(loggedin.length != 0){
            const user_rating_t = await connection.execute(`SELECT RATING FROM CHARACTER_RATING WHERE CHARACTER_UID = :character_uid AND USER_ID = :user_id`, 
                                                        {
                                                            character_uid: req.params.character_id,
                                                            user_id: loggedin[0][0]
                                                        });
            user_rating = user_rating_t.rows;
        }
        const avg_score = avg_score_t.rows[0];
        const per_score_count = per_score_count_t.rows;
        //console.log('printing what i need')
        // console.log(per_score_count);
        //console.log(user_rating);
        
        await connection.close();
        const voiced_by = voiced_by_t.rows;
        
        const edit_access = (loggedin.length != 0) ? ((loggedin[0][3]) === 'Admin' || (loggedin[0][3]) === 'Moderator') : false;
        console.log(loggedin)
        //console.log(data)
        //console.log(data.length)
        res.render('character_details', { data, voiced_by, appeared_in_anime_data, appeared_in_manga_data, per_score_count, avg_score,
                                            edit_access, user_rating: user_rating[0]});
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Internal Server Error');
    }
});
app.post('/character/:character_id', async (req, res) => {
    if(loggedin.length == 0){
        res.send(`
            <script>
                alert('Please log in first.');
                window.location.href = '/login';
            </script>
        `);
    }
    try {
        const connection = await oracledb.getConnection(dbConfig);
        const existence = await connection.execute(`SELECT * FROM CHARACTER_RATING WHERE CHARACTER_UID = :character_uid AND USER_ID = :user_id`,
                                                    {
                                                        character_uid: req.params.character_id,
                                                        user_id: loggedin[0][0]
                                                    });
        if(existence.rows.length === 0){
            const result = await connection.execute(`INSERT INTO CHARACTER_RATING (CHARACTER_UID, USER_ID, RATING) VALUES (:character_uid, :user_id, :rating)`, 
                                                {
                                                    character_uid: req.body.character_uid,
                                                    user_id: loggedin[0][0],
                                                    rating: req.body.review_rating
                                                });
        } else {
            const result = await connection.execute(`UPDATE CHARACTER_RATING SET RATING = :rating WHERE CHARACTER_UID = :character_uid AND USER_ID = :user_id`, 
                                                {
                                                    character_uid: req.body.character_uid,
                                                    user_id: loggedin[0][0],
                                                    rating: req.body.review_rating
                                                });
        }
        await connection.commit();
        await connection.close();
        res.redirect(`/character/${req.params.character_id}`);
    } catch (error) {
        console.log(error);
    }
});
app.get('/character/:character_id/edit', async (req, res) => {
    try {
    const connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute(`SELECT * FROM CHARACTERS WHERE CHARACTER_UID = ${req.params.character_id}`);
    const data = result.rows;
    if(data.length != 1) 
        res.redirect('/');
    const voiced_by_t = await connection.execute(`SELECT P.*, VA.LANGUAGE
                                                FROM PERSON P
                                                JOIN (
                                                    SELECT PERSON_UID, LANGUAGE
                                                    FROM VOICE_ARTIST
                                                    WHERE CHARACTER_UID = :character_uid
                                                ) VA ON P.PERSON_UID = VA.PERSON_UID
                                                ORDER BY P.PERSON_UID`
                                                , {
                                                    character_uid: req.params.character_id
                                                });
    const voiced_by = voiced_by_t.rows;
    const appeared_in_anime = await connection.execute(`SELECT A.ANIME_ID, A.TITLE_ENGLISH, A.TITLE_NATIVE, A.COVER_IMAGE
                                                FROM ANIME A JOIN CHARACTERS_X_ANIME CXA ON A.ANIME_ID = CXA.ANIME_ID
                                                WHERE CXA.CHARACTER_UID = :character_uid`,
                                                {
                                                    character_uid: req.params.character_id
                                                });
    const appeared_in_anime_data = appeared_in_anime.rows;
    const appeared_in_manga = await connection.execute(`SELECT M.MANGA_ID, M.TITLE_ENGLISH, M.TITLE_NATIVE, M.COVER_IMAGE
                                                FROM MANGA M JOIN CHARACTERS_X_MANGA CXM ON M.MANGA_ID = CXM.MANGA_ID
                                                WHERE CXM.CHARACTER_UID = :character_uid`,
                                                {
                                                    character_uid: req.params.character_id
                                                });
    const appeared_in_manga_data = appeared_in_manga.rows;
    const per_score_count_t = await connection.execute(
        `SELECT S.RATING, COUNT(CR.RATING)  
        FROM (
            SELECT 1 AS RATING FROM DUAL UNION ALL
            SELECT 2 AS RATING FROM DUAL UNION ALL
            SELECT 3 AS RATING FROM DUAL UNION ALL
            SELECT 4 AS RATING FROM DUAL UNION ALL
            SELECT 5 AS RATING FROM DUAL 
        ) S 
        LEFT JOIN CHARACTER_RATING CR ON CR.RATING = S.RATING AND CR.CHARACTER_UID = :character_uid
        GROUP BY S.RATING
        ORDER BY NVL(S.RATING, 0) DESC`,
        {
            character_uid: req.params.character_id
        }
    )
    const avg_score_t = await connection.execute(`SELECT ROUND(AVG(RATING), 1), COUNT(*) FROM CHARACTER_RATING WHERE CHARACTER_UID = :character_uid`, {character_uid: req.params.character_id});
    var user_rating = 0;
    if(loggedin.length != 0){
        const user_rating_t = await connection.execute(`SELECT RATING FROM CHARACTER_RATING WHERE CHARACTER_UID = :character_uid AND USER_ID = :user_id`, 
                                                    {
                                                        character_uid: req.params.character_id,
                                                        user_id: loggedin[0][0]
                                                    });
        user_rating = user_rating_t.rows;
    }
    const avg_score = avg_score_t.rows[0];
    const per_score_count = per_score_count_t.rows;
    const edit_access = (loggedin.length != 0) ? ((loggedin[0][3]) === 'Admin' || (loggedin[0][3]) === 'Moderator') : false;
        await connection.close();
        res.render('character_details_edit', { data, voiced_by, appeared_in_anime_data, appeared_in_manga_data, per_score_count, avg_score,
                                            user_rating: user_rating[0], edit_access});
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Internal Server Error');
    }
});
app.post('/character/:character_id/edit', async (req, res) => {
    async function run() {
        try {
            const connection = await oracledb.getConnection(dbConfig);
            const result = await connection.execute(`
                UPDATE CHARACTERS
                SET FIRST_NAME = :first_name,
                    LAST_NAME = :last_name,
                    ROLE_PLAY = :role_play,
                    DESCRIPTION = :description,
                    IMAGE_LINK = :image_link
                WHERE CHARACTER_UID = :character_uid
            `, {
                first_name: req.body.first_name,
                last_name: req.body.last_name,
                role_play: req.body.role,
                description: req.body.description,
                image_link: req.body.image_link,
                character_uid: req.body.character_uid
            });

            await connection.commit(); //to commit //if possible add a timer alert
            await connection.close();
            console.log(result);
            res.send(`
                <script>
                    window.location.href = '/character/${req.body.character_uid}';
                </script>
            `)
        } catch (error) {
            console.log(error);
        }
    }
    run();
});

app.get('/person', async (req, res) => {
    try{
        const connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(`SELECT * FROM PERSON ORDER BY DBMS_RANDOM.VALUE FETCH FIRST 50 ROWS ONLY`);
        const data = result.rows;
        await connection.close();
        res.render('person', { data, page_index: 0, name: '' });
    } catch (error) {
        console.log(error);
    }
});

app.get('/person/search', async (req, res) => {
    try {
        const connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(
            `   
                SELECT * FROM PERSON WHERE LOWER(NAME) LIKE '%${req.query.name.toLowerCase()}%'
                OFFSET ${Number(req.query.page_index)*50} ROWS FETCH NEXT 50 ROWS ONLY
            `
        );
        const data = result.rows;
        await connection.close();
        res.render('person', { data, name: req.query.name, page_index: Number(req.query.page_index)+1 });
    } catch (error) {
        console.log(error);
    }
});


app.get('/person/:person_uid', async (req, res) => {
    try {
        const connection = await oracledb.getConnection(dbConfig);
        console.log(req.params.person_uid)
        const result = await connection.execute(`SELECT * FROM PERSON WHERE PERSON_UID = ${req.params.person_uid}`);
        const worked_on = await connection.execute(`SELECT A.ANIME_ID, A.TITLE_ENGLISH, A.TITLE_NATIVE, A.COVER_IMAGE
                                                    FROM ANIME A JOIN STAFF_X_ANIME SXA ON A.ANIME_ID = SXA.ANIME_ID
                                                    WHERE SXA.PERSON_UID = :person_uid`, {person_uid: `${req.params.person_uid}`});
                                                    //THREE TABLE EXPANDING SUBQUERY
        const voiced_on = await connection.execute(`SELECT A.ANIME_ID, A.TITLE_ENGLISH, A.TITLE_NATIVE, A.COVER_IMAGE
                                                    FROM ANIME A WHERE ANIME_ID IN (
                                                        SELECT CXA.ANIME_ID FROM CHARACTERS_X_ANIME CXA WHERE CXA.CHARACTER_UID IN (
                                                            SELECT VA.CHARACTER_UID FROM VOICE_ARTIST VA WHERE VA.PERSON_UID = :person_uid
                                                        )
                                                    )`, {person_uid: `${req.params.person_uid}`});
        const characters_voiced = await connection.execute(`SELECT C.CHARACTER_UID, C.FIRST_NAME, C.LAST_NAME, C.IMAGE_LINK
                                                    FROM CHARACTERS C JOIN VOICE_ARTIST VA ON C.CHARACTER_UID = VA.CHARACTER_UID
                                                    WHERE VA.PERSON_UID = :person_uid`, {person_uid: `${req.params.person_uid}`});
        
        console.log(voiced_on.rows)
        const data = result.rows;
        await connection.close();

        if(data.length != 1) 
            res.redirect('/');

        console.log(loggedin)
        //console.log(data)
        //console.log(data.length)
        res.render('person_details', { data, worked_on:worked_on.rows, voiced_on:voiced_on.rows , characters_voiced: characters_voiced.rows });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/studio/:studio_uid', async (req, res) => {
    try {
        const connection = await oracledb.getConnection(dbConfig);
        const visit_count_inc = await connection.execute(`UPDATE STUDIO SET VISIT_COUNT = VISIT_COUNT + 1 WHERE STUDIO_UID = :studio_uid`, {studio_uid: `${req.params.studio_uid}`});
        //console.log(req.params.studio_uid)
        const result = await connection.execute(`SELECT * FROM STUDIO WHERE STUDIO_UID = :studio_uid`, {studio_uid: `${req.params.studio_uid}`});
        const produced_t = await connection.execute(`SELECT A.ANIME_ID, A.TITLE_ENGLISH, A.TITLE_NATIVE, A.COVER_IMAGE
                                                        FROM ANIME A JOIN STUDIO_X_ANIME SXA ON A.ANIME_ID = SXA.ANIME_ID
                                                        WHERE SXA.STUDIO_UID = :studio_uid AND CONTRIBUTION = 'PRODUCTION'`, {studio_uid: `${req.params.studio_uid}`});
        const animated_t = await connection.execute(`SELECT A.ANIME_ID, A.TITLE_ENGLISH, A.TITLE_NATIVE, A.COVER_IMAGE
                                                        FROM ANIME A JOIN STUDIO_X_ANIME SXA ON A.ANIME_ID = SXA.ANIME_ID
                                                        WHERE SXA.STUDIO_UID = :studio_uid AND CONTRIBUTION = 'PRODUCTION'`, {studio_uid: `${req.params.studio_uid}`});
        const produced = produced_t.rows;
        const animated = animated_t.rows;
        const data = result.rows;
        await connection.close();

        if(data.length != 1) 
            res.redirect('/');

        console.log(loggedin)
        //console.log(data)
        //console.log(data.length)
        res.render('studio_details', { data, produced, animated });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/search/studios', async (req, res) => {
    try {
        const connection = await oracledb.getConnection(dbConfig);
        studio_name_query = (req.query.studio_name != '') ? `AND LOWER(S.NAME) LIKE '%${req.query.studio_name.toLowerCase()}%'` : '';
        studio_name_query_activation = (req.query.studio_name != '') ? true : false;
        anime_name_query = (req.query.anime_name != '') ? `AND LOWER(A.TITLE_ENGLISH) LIKE '%${req.query.anime_name.toLowerCase()}%'` : '';
        anime_name_query_activation = (req.query.anime_name != '') ? true : false;
        const result = await connection.execute(
            `   
            SELECT S.STUDIO_UID, S.NAME, S.IMAGE_LINK
            FROM STUDIO S
            ${anime_name_query_activation ? `FULL JOIN STUDIO_X_ANIME SXA ON SXA.STUDIO_UID = S.STUDIO_UID FULL JOIN ANIME A ON A.ANIME_ID = SXA.ANIME_ID` : ''}
            WHERE S.STUDIO_UID IS NOT NULL
            ${studio_name_query}
            ${anime_name_query}
            GROUP BY S.STUDIO_UID, S.NAME, S.IMAGE_LINK
            `
        );
        const data = result.rows;
        await connection.close();
        res.render('studios', { data });
    } catch (error) {
        console.log(error);
    }
});


app.get('/studios', async (req, res) => {
    try{
        const connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(`SELECT * FROM STUDIO ORDER BY DBMS_RANDOM.VALUE FETCH FIRST 50 ROWS ONLY`);
        const data = result.rows;
        await connection.close();
        res.render('studios', { data })
    } catch (error) {
        console.log(error);
    }
});

app.get('/admin/sql', async (req, res) => {
    if(loggedin.length == 0){
        res.redirect('/');
    }
    if(Number(loggedin[0][0]) == 3010 || Number(loggedin[0][0]) == 3002 ){
        res.render('admin_sql');
    } else {
        res.redirect('/');
    }
});

app.get('/forum', async (req, res) => { //needs a lot of work to be done
    try{
        const connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(`SELECT * FROM DISCUSSION ORDER BY LAST_EDITED`);
        const data = result.rows;
        await connection.close();
        res.render('forumS', { data })
    } catch (error) {
        console.log(error);
    }
});
app.get('/post/:id', async (req, res) => {
    try{
        const connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(`SELECT * FROM DISCUSSION WHERE DISCUSSION_ID = ${req.params.id}`);
        const data = result.rows;
        await connection.close();
        res.render('posts', { data })
    } catch (error) {
        console.log(error);
    }
});
app.get('/delete/:user_id', async (req, res) => {
    if(loggedin.length == 0 && Number(loggedin[0][0]) != req.params.user_id){
        res.redirect('/');
    }
    res.render('account_delete_prompt', { user_id: req.params.user_id });
});
app.post('/delete/:user_id', async (req, res) => {
    try{
        const connection = await oracledb.getConnection(dbConfig);
        var query = `SELECT * FROM USERS WHERE USERNAME = :username AND PASSWORD = ORA_HASH(:password)`;
        const verify = await connection.execute(query, {username: `${req.body.username}`, password: `${req.body.password}`});
        if(verify.rows.length === 0){
            //clear the loggedin array
            loggedin = [];
            res.send(`
                <script>
                    alert('Incorrect Password, Suspicous Activity Detected.');
                    window.location.href = '/login';
                </script>
            `);
        }
        const result = await connection.execute(`UPDATE USERS SET ACCOUNT_STATUS = 3 WHERE USER_ID = ${req.params.user_id}`);
        await connection.commit();
        await connection.close();
        res.redirect('/');
    } catch (error) {
        console.log(error);
    }
});

app.get('/person/:person_uid', async (req, res) => { 
    try { 
        const connection = await oracledb.getConnection(dbConfig); 
        const visit_count_inc = await connection.execute(`UPDATE PERSON SET VISIT_COUNT = VISIT_COUNT + 1 WHERE PERSON_UID = :person_uid`, {person_uid: `${req.params.person_uid}`});
        console.log(req.params.person_uid) 
        const result = await connection.execute(`SELECT * FROM PERSON WHERE PERSON_UID = ${req.params.person_uid}`); 
        const worked_on_t = await connection.execute(`SELECT A.ANIME_ID, A.TITLE_ENGLISH, A.TITLE_NATIVE, A.COVER_IMAGE 
                                                    FROM ANIME A JOIN STAFF_X_ANIME SXA ON A.ANIME_ID = SXA.ANIME_ID 
                                                    WHERE SXA.PERSON_UID = :person_uid`, {person_uid: `${req.params.person_uid}`}); 
                                                    //THREE TABLE EXPANDING SUBQUERY 
        const voiced_on_t = await connection.execute(`SELECT A.ANIME_ID, A.TITLE_ENGLISH, A.TITLE_NATIVE, A.COVER_IMAGE 
                                                    FROM ANIME A WHERE ANIME_ID IN ( 
                                                        SELECT CXA.ANIME_ID FROM CHARACTERS_X_ANIME CXA WHERE CXA.CHARACTER_UID IN ( 
                                                            SELECT VA.CHARACTER_UID FROM VOICE_ARTIST VA WHERE VA.PERSON_UID = :person_uid 
                                                        ) 
                                                    )`, {person_uid: `${req.params.person_uid}`}); 
        const characters_voiced_t = await connection.execute(`SELECT C.CHARACTER_UID, C.FIRST_NAME, C.LAST_NAME, C.IMAGE_LINK 
                                                    FROM CHARACTERS C JOIN VOICE_ARTIST VA ON C.CHARACTER_UID = VA.CHARACTER_UID 
                                                    WHERE VA.PERSON_UID = :person_uid`, {person_uid: `${req.params.person_uid}`}); 
         
        console.log(voiced_on_t.rows) 
        const data = result.rows; 
        await connection.close(); 
 
        if(data.length != 1)  
            res.redirect('/'); 
 
        console.log(loggedin) 
        //console.log(data) 
        //console.log(data.length) 
        res.render('person_details', { data, worked_on: worked_on_t.rows, voiced_on: voiced_on_t.rows, characters_voiced: characters_voiced_t.rows }); 
    } catch (err) { 
        console.error(err.message); 
        res.status(500).send('Internal Server Error'); 
    } 
});

//frontend e baki
app.get('/anime/:anime_id/delete/:studio_uid', async (req, res) => {
    try {
        const connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(`DELETE FROM STUDIO_X_ANIME WHERE ANIME_ID = ${req.params.anime_id} AND STUDIO_UID = ${req.params.studio_uid}`);
        await connection.commit();
        await connection.close();
        res.redirect(`/anime/${req.params.anime_id}/edit`);
    } catch (error) {
        console.log(error);
        res.send(error);
    }
});
app.get('/manga/:manga_id/delete/author/:author_id', async (req, res) => {
    try {
        const connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(`DELETE FROM AUTHOR_X_MANGA WHERE MANGA_ID = ${req.params.manga_id} AND PERSON_UID = ${req.params.author_id}`);
        await connection.commit();
        await connection.close();
        res.redirect('/manga/'+req.params.manga_id+'/edit');
    } catch (error) {
        console.log(error);
        res.send(error);
    }
});

app.get('/character/:character_uid/add/va', async (req, res) => {

});

app.use((req, res)=>{
    res.status(404).redirect('/');
})


// Start Server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
