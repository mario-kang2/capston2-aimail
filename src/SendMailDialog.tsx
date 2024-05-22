import { Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, Select, SelectChangeEvent, TextField } from "@mui/material";
import React, { useEffect, useState } from "react";

export interface SendMailDialogProps {
    open: boolean;
    onClose: (sent:boolean) => void;
}

export default function SendMailDialog(props: SendMailDialogProps) {
    const {open, onClose} = props;
    const {ipcRenderer} = window.require("electron");

    const [sendAccountData, setSendAccountData] = useState([]);
    const [emailFrom, setEmailFrom] = useState("");
    const [emailTo, setEmailTo] = useState("");
    const [emailCc] = useState("");
    const [emailBcc] = useState("");
    const [emailSubject, setEmailSubject] = useState("");
    const [emailContent, setEmailContent] = useState("");

    const [emailToError, setEmailToError] = useState(false);
    const [emailSubjectError, setEmailSubjectError] = useState(false);
    const [emailContentError, setEmailContentError] = useState(false);

    // 보내는 메일 계정 목록 설정
    useEffect(() => {
        const {ipcRenderer} = window.require("electron");
        ipcRenderer.send("lookupSendAccountDatabase");
        ipcRenderer.once('lookupSendAccountDatabaseReply', (eve:any, res:any) => {
            setSendAccountData(res);
            ipcRenderer.removeAllListeners('lookupSendAccountDatabaseReply');
        });
    });

    // 닫기 버튼 클릭 시
    const handleClose = () => {
        onClose(false);
    }

    const handleFromChange = (e: SelectChangeEvent<string>) => {
        setEmailFrom(e.target.value);
    }

    const handleToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEmailTo(e.target.value);
        if (e.target.value.length <= 0) {
            setEmailToError(true);
        } else {
            setEmailToError(false);
        }
    }

    const handleSubjectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEmailSubject(e.target.value);
        if (e.target.value.length <= 0) {
            setEmailSubjectError(true);
        } else {
            setEmailSubjectError(false);
        }
    }

    const handleContentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEmailContent(e.target.value);
        if (e.target.value.length <= 0) {
            setEmailContentError(true);
        } else {
            setEmailContentError(false);
        }
    }

    const handleSend = () => {
        // 유효성 검사
        if (emailTo.length <= 0) {
            setEmailToError(true);
            return;
        }
        if (emailSubject.length <= 0) {
            setEmailSubjectError(true);
            return;
        }
        if (emailContent.length <= 0) {
            setEmailContentError(true);
            return;
        }

        // 메일 전송
        ipcRenderer.send("sendMail", {
            from: emailFrom,
            to: emailTo,
            cc: emailCc,
            bcc: emailBcc,
            subject: emailSubject,
            content: emailContent
        });

        ipcRenderer.once('sendMailReply', (eve:any, res:any) => {
            if (res) {
                alert("Mail sent successfully");
                onClose(true);
            }
            ipcRenderer.removeAllListeners('sendMailReply');
        });

    }

    return (
        <Dialog open={open}>
            <DialogTitle>Send Mail</DialogTitle>
            <DialogContent>
                <FormControl variant="standard" fullWidth>
                    <InputLabel>From</InputLabel>
                    <Select
                        required
                        fullWidth
                        variant="standard"
                        label="From"
                        value={emailFrom}
                        onChange={(e: SelectChangeEvent<string>) => handleFromChange(e)}>
                            {sendAccountData.map((account:any) => {
                                return (
                                    <MenuItem value={account.mailEmail}>{account.description} ({account.mailEmail})</MenuItem>
                                )
                            })}
                    </Select>
                </FormControl>
                <TextField
                    required
                    fullWidth
                    variant="standard"
                    label="To"
                    placeholder="Separated by semicolons(;)"
                    value={emailTo}
                    error={emailToError}
                    helperText={emailToError ? "To is required" : ""}
                    onChange={(e:React.ChangeEvent<HTMLInputElement>) => handleToChange(e)}/>
                <TextField
                    fullWidth
                    variant="standard"
                    label="CC"
                    placeholder="Separated by semicolons(;)"
                    value={emailCc}/>
                <TextField
                    fullWidth
                    variant="standard"
                    label="BCC"
                    placeholder="Separated by semicolons(;)"
                    value={emailBcc}/>
                <TextField
                    required
                    fullWidth
                    variant="standard"
                    label="Subject"
                    value={emailSubject}
                    error={emailSubjectError}
                    helperText={emailSubjectError ? "Subject is required" : ""}
                    onChange={(e:React.ChangeEvent<HTMLInputElement>) => handleSubjectChange(e)}/>
                <TextField
                    required
                    fullWidth
                    variant="standard"
                    label="Content"
                    multiline
                    rows={10}
                    value={emailContent}
                    error={emailContentError}
                    helperText={emailContentError ? "Content is required" : ""}
                    onChange={(e:React.ChangeEvent<HTMLInputElement>) => handleContentChange(e)}/>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Cancel</Button>
                <Button onClick={handleSend}>Send</Button>
            </DialogActions>
        </Dialog>
    )
}