const sqlite3 = require("sqlite3");
const db = new sqlite3.Database("./mail.db");
const Imap = require('node-imap');
const simpleParser = require('mailparser').simpleParser;
var fs = require('fs'), fileStream;
var inspect = require('util').inspect
function setupDatabase(){
    db.serialize(function() {
        db.run("CREATE TABLE IF NOT EXISTS users (usersid INTEGER primary key)");
        db.run("CREATE TABLE IF NOT EXISTS mail_account ([id] integer primary key autoincrement, [description] text, [mailHost] text, [mailPort] int, [mailSecurity] text, [mailUsername] text, [mailEmail] text, [mailPassword] text)");
        db.run("CREATE TABLE IF NOT EXISTS emails (email_id INTEGER primary key, address_id TEXT , subject TEXT, sender TEXT,label integer,recipient text,body text,times timestamp,attachment boolaen)");
        db.run("CREATE TABLE IF NOT EXISTS summary(summary_id INTEGER primary key , email_id INTEGER references emails(email_id),summary_text text, is_about_schedule boolaen)");
        db.run("CREATE TABLE IF NOT EXISTS schedule (schedule_id INTEGER primary key , summary_id INTEGER references summary(summary_id), start_time timestamp, end_time timestamp)");
        db.run("CREATE TABLE IF NOT EXISTS attachment(attachment_id INTEGER primary key autoincrement , email_id INTEGER references emails(email_id),filename text, content blob)");
        db.run("CREATE TABLE IF NOT EXISTS contact(contact_id INTEGER primary key , email_id INTEGER references email_address(address_id),name text, address text)");
    });
}

async function searchbytype(type,values,callback){

    const sql = 'SELECT * FROM emails WHERE '+type+' LIKE ?';
    db.all(sql,[`%${values}%`],(err, rows)=>{
        if (err) {
            console.error('쿼리 실행 오류:', err.message);
            callback(err, null); // 오류가 발생했을 때 콜백에 오류를 전달하고 빈 배열을 반환
            return;
        }
        const emails = rows || [];
        callback(null,emails);
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

        // 삭제된 메일 감지 및 DB에서 삭제
        for (const savedEmail of savedEmails) {
            if (!searchResults.some(uid => uid === savedEmail.email_id)) {
                db.run('DELETE FROM emails WHERE email_id = ?', [savedEmail.email_id]);
            }
        }

        for (const uid of searchResults) {

            if (!savedEmails.some(email => email.email_id === Number(uid))) {
                const f = imap.fetch(uid, { bodies: '', struct: true });
                f.once('message', (message,seno) => {
                    let email = {
                        uid: 0,
                        subject: '',
                        sender:'',
                        recipient: '',
                        body: '',
                        times: new Date().toISOString(),
                        attachments: false,
                        attachment:[]
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
                                            reject(err2);
                                            return;
                                        }
                                        email.times = mail.date.toISOString();
                                        email.subject = mail.subject || '';
                                        email.sender = mail.from.text || '';
                                        if(mail.to) {
                                            email.recipient = (mail.to.text || '').toString();
                                        }
                                        email.attachments = mail.attachments.length > 0;
                                        if(email.attachments){
                                            console.log("길이:",mail.attachments.length)
                                            console.log(mail.attachments[0].content);
                                        }
                                        mail.attachments.forEach((attachment)=>{
                                            email.attachment.push({filename:attachment.filename,content:attachment.content})
                                            console.log(email.attachment);
                                        });


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
                                   //console.error('이메일 저장 오류:',insertErr);
                               } else {
                                   //console.log('이메일 저장 완료:',email.subject);
                                   if (email.attachments) {
                                       email.attachment.forEach((attachment) => {
                                           db.run('INSERT INTO attachment(email_id,filename,content) VALUES (?,?,?)',
                                               [email.uid, attachment.filename, attachment.content], (insertErr) => {
                                                   if (insertErr) {
                                                       console.error('첨부파일 저장 오류:', insertErr);
                                                   } else {
                                                       console.log('이메일 저장 완료:', attachment.filename);
                                                   }
                                               });
                                       });
                                   }
                               }
                           });
                    }).catch((error) => {
                        console.error('이메일 처리 오류:', error);
                    });
                });
            }
        }
        imap.end();
        imap.once('end', function() {
            getSavedEmails(imap._config.user, (err, rows) => {
                if (err) {
                    console.error('이메일 가져오기 오류:', err);
                } else {
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