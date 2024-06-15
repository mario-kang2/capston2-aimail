import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";

export interface RemoveContactProps {
    open: boolean;
    onClose: () => void;
    scheduleDateFrom: string;
    scheduleDateTo: string;
    scheduleTimeFrom: string;
    scheduleTimeTo: string;
    scheduleSummaryID: number;
    scheduleSummaryTitle: string;
}

export default function RemoveContactDialog(props: RemoveContactProps) {
    const {open, onClose, scheduleDateFrom, scheduleDateTo,
        scheduleTimeFrom, scheduleTimeTo, scheduleSummaryID,
        scheduleSummaryTitle} = props;
    const {ipcRenderer} = window.require("electron");

    const handleDeclineSchedule = () => {
        ipcRenderer.send("addSchedule", {
            dateFrom: scheduleDateFrom,
            dateTo: scheduleDateTo,
            timeFrom: scheduleTimeFrom,
            timeTo: scheduleTimeTo,
            summaryID: scheduleSummaryID,
            title: "**DECLINED**"
        });
        onClose();
    }

    const handleAcceptSchedule = () => {
        ipcRenderer.send("addSchedule", {
            dateFrom: scheduleDateFrom,
            dateTo: scheduleDateTo,
            timeFrom: scheduleTimeFrom,
            timeTo: scheduleTimeTo,
            summaryID: scheduleSummaryID,
            title: scheduleSummaryTitle
        });
        onClose();
    }

    return (
        <Dialog open={open}>
            <DialogTitle>Found Schedule</DialogTitle>
            <DialogContent>
                <DialogContentText>Found Schedule from {scheduleDateFrom} {scheduleTimeFrom} to {scheduleDateTo} {scheduleTimeTo}.</DialogContentText>
                <DialogContentText>{scheduleSummaryTitle}</DialogContentText>
                <DialogContentText>Accept this schedule?</DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleDeclineSchedule}>Decline</Button>
                <Button onClick={handleAcceptSchedule}>Accept</Button>
            </DialogActions>
        </Dialog>
    )
}