import { Button, Dialog, DialogActions, DialogContent, Typography } from "@mui/material";
import { DateCalendar } from "@mui/x-date-pickers";

import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers';

import dayjs from 'dayjs';
import { useState } from "react";

export interface CalendarDialogProps {
    open: boolean;
    onClose: () => void;
}

export default function AddAccountDialog(props: CalendarDialogProps) { 
    const {open, onClose} = props;
    const {ipcRenderer} = window.require("electron");

    const [selectedDate, setSelectedDate] = useState(dayjs());

    const handleClose = () => {
        onClose();
    }

    const handleSelectedDateChange = (newValue: dayjs.Dayjs) => {
        setSelectedDate(newValue);
        console.log(newValue);
    }

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogContent>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DateCalendar value={selectedDate} onChange={(newValue) => handleSelectedDateChange(newValue)}/>
                </LocalizationProvider>
                <Typography>{selectedDate.format("YYYY-MM-DD")}</Typography>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Close</Button>
            </DialogActions>
        </Dialog>
    )
}