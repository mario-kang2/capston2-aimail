const sqlite3 = require("sqlite3");
const db = new sqlite3.Database("./mail.db");
const Imap = require('node-imap');
const simpleParser = require('mailparser').simpleParser;
var fs = require('fs'), fileStream;
var inspect = require('util').inspect
function setupDatabase(){
    db.serialize(function() {
        db.run("CREATE TABLE IF NOT EXISTS users (usersid INTEGER primary key)");
        db.run("CREATE TABLE IF NOT EXISTS email_address (address_id INTEGER primary key , user_id INTEGER, protocol TEXT, host TEXT,address text,password text)");
        db.run("CREATE TABLE IF NOT EXISTS emails (email_id INTEGER primary key, address_id TEXT , subject TEXT, sender TEXT,label integer,recipient text,body text,times timestamp,attachment boolaen)");
        db.run("CREATE TABLE IF NOT EXISTS summary(summary_id INTEGER primary key , email_id INTEGER references emails(email_id),summary_text text, is_about_schedule boolaen)");
        db.run("CREATE TABLE IF NOT EXISTS schedule (schedule_id INTEGER primary key , summary_id INTEGER references summary(summary_id), start_time timestamp, end_time timestamp)");
        db.run("CREATE TABLE IF NOT EXISTS attachment(attachment_id INTEGER primary key , email_id INTEGER references emails(email_id),type text, file_path file)");
        db.run("CREATE TABLE IF NOT EXISTS contact(contact_id INTEGER primary key , email_id INTEGER references email_address(address_id),name text, address text)");
    });
}

function searchbytype(type,values,callback){
    const sql = "SELECT * FROM emails WHERE ${type} LIKE '%' || ? || '%'";
    db.all(sql,[values],(err,rows)=>{
        if (err) {
            console.error('쿼리 실행 오류:', err.message);
            callback(err, null); // 오류가 발생했을 때 콜백에 오류를 전달하고 빈 배열을 반환
            return;
        }

        // 쿼리 실행이 성공했을 때 rows를 콜백으로 반환
        callback(null, rows);
    });
}
function checkDatabase(table) {
    const dbPath = './mail.db';
    const db = new sqlite3.Database(dbPath);

    db.serialize(() => {
        db.each('SELECT * FROM '+table, (err, row) => {
            if (err) {
                console.error('Error while accessing database:', err.message);
                return;
            }
        });
    });

    db.close();
}
function getSavedEmails(address,callback) {
    const sql ='SELECT * FROM emails where address_id=?';
    db.all(sql,[address] ,(err, rows) => {
        if (err) {
            console.error('Error while retrieving emails:', err.message);
            callback([]);
            return;
        }
        const emails = rows || [];
        callback(null,emails);
    });
}
async function fetchNewEmails(imap, eve) {
    try {
        await new Promise((resolve, reject) => {

            imap.once('ready', resolve);
            imap.once('error', reject);
            imap.connect();
        });
        const box = await new Promise((resolve, reject) => {
            imap.openBox('INBOX', true, (err, box) => {
                if (err) reject(err);
                else resolve(box);
            });
        });
        const savedEmails = await new Promise((resolve, reject) => {
            getSavedEmails(imap._config.user, (err, rows) => {

                if (err) {
                    reject(err);}
                else resolve(rows);
            });
        });

        const searchResults = await new Promise((resolve, reject) => {
            imap.search(['ALL'], (err, searchResults) => {
                if (err) reject(err);
                else resolve(searchResults);
            });
        });

        for (const uid of searchResults) {

            if (!savedEmails.some(email => email.email_id === Number(uid))) {
                const f = imap.fetch(uid, { bodies: '', struct: true });
                //body 추출을 위한 test코드
                /*var f = imap.seq.fetch(box.messages.total + ':*', { bodies: '' });
                f.on('message', (msg, seqno) => {
                    console.log('Message #%d', seqno);
                    const prefix = `(#${seqno}) `;
                    msg.once('body', (stream, info) => {
                        simpleParser(stream, (parseErr, parsed) => {
                            if (parseErr) throw parseErr;
                            console.log(`${prefix}Subject: ${parsed.subject}`);
                            console.log(`${prefix}From: ${parsed.from.text}`);
                            console.log(`${prefix}To: ${parsed.to.text}`);
                            if (parsed.text) {
                                //console.log(`${prefix}Text body: ${parsed.text}`);
                            }
                            if (parsed.html) {
                                //console.log(`${prefix}HTML body: ${parsed.html}`);
                            }
                        });
                    });
                    msg.once('attributes', function(attrs) {
                        console.log(prefix + 'Attributes: %d', attrs.uid);
                    });
                });*/
                    //console.log(f['boides']);
                f.once('message', (message,seno) => {
                    let email = {
                        uid: 0,
                        subject: '',
                        sender:'',
                        recipient: '',
                        body: '',
                        times: new Date().toISOString(),
                        attachments: false
                    };
                    Promise.all([
                        new Promise((resolve, reject) => {
                            message.on('body', (stream, info) => {
                                let buffer = '';
                                stream.on('data', (chunk) => {
                                    buffer += chunk.toString('utf8');
                                });
                                stream.once('end', () => {
                                    simpleParser(buffer, (err2, mail) => {
                                        if (err2) {
                                            console.log('Read mail executor error .....', err2);
                                            reject(err2);
                                            return;
                                        }
                                        email.times = mail.date.toISOString();
                                        email.subject = mail.subject || '';
                                        email.sender = mail.from.text || '';
                                        console.log(typeof (mail.to.text || ''));
                                        email.recipient = (mail.to.text || '').toString();

                                        email.attachments = mail.attachments.length > 0;
                                        // Mail Text 구분을 위해 Prefix 삽입
                                        if (mail.text) {
                                            email.body = mail.text || '';
                                            email.body = 'PLAIN\r\n\r\n' + email.body;
                                            
                                        }
                                        if (mail.html) {
                                            email.body = mail.html || '';
                                            email.body = 'HTML\r\n\r\n' + email.body;
                                        }
                                        resolve();
                                    });
                                });
                            });
                        }),
                        new Promise((resolve, reject) => {
                            message.once('attributes', (attrs) => {
                                email.uid = attrs.uid;
                                resolve();
                            });
                        })
                    ]).then(() => {
                        // body와 attributes 이벤트 핸들러가 모두 완료되면 이메일을 데이터베이스에 저장
                       db.run(`INSERT INTO emails (email_id, address_id, subject, sender, recipient, label, body, times, attachment) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            [email.uid, imap._config.user, email.subject, email.sender, email.recipient, 0, email.body, email.times, email.attachments], (insertErr) => {
                                if (insertErr) {
                                    console.error('이메일 저장 오류:', insertErr);
                                } else {
                                    console.log('이메일 저장 완료:', email.subject);
                                }
                            });
                    }).catch((error) => {
                        console.error('이메일 처리 오류:', error);
                    });
                });
            }
        }
        console.log('저장 끝');
        imap.end();
        imap.once('end', function() {
            getSavedEmails(imap._config.user, (err, rows) => {
                if (err) {
                    console.error('이메일 가져오기 오류:', err);
                } else {
                    console.log("가져오기 완료");
                    const mail=rows.map(({sender,subject,body,times})=>({from:[sender],subject:[subject],body:[body],times:[times]}));
                    eve.sender.send('getMailListReply', mail);
                }
            });
        })
    } catch (err) {
        console.error('오류:', err);
    }
}

module.exports = {
    setupDatabase,
    searchbytype,
    getSavedEmails,
    fetchNewEmails
};