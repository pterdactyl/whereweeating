import { useMemo, useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select, { type SelectChangeEvent } from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { AdapterLuxon } from '@mui/x-date-pickers/AdapterLuxon';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { hmToLuxonClock, luxonClockToHm } from './timePickerHelpers';
import { validateInterval } from './parsing';
import { WEEKDAYS, emptyWeeklyHours, type HoursInterval, type Weekday, type WeeklyHoursNamed } from './types';

export type HoursEditorProps = {
  value: WeeklyHoursNamed;
  onChange: (next: WeeklyHoursNamed) => void;
  timeZone?: string;
  disabled?: boolean;
};

const TAB_SHORT: Record<Weekday, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
};

function formatDayTitle(day: Weekday): string {
  return day.charAt(0).toUpperCase() + day.slice(1);
}

function cloneIntervals(rows: HoursInterval[]): HoursInterval[] {
  return rows.map(r => ({ open: r.open, close: r.close }));
}

function normalizeHmPair(open: string, close: string): HoursInterval {
  const padSlot = (hm: string) => {
    const parsed = /^(\d{1,2}):(\d{2})$/.exec(String(hm).trim());
    if (!parsed) return hm.trim();
    return `${String(Number(parsed[1])).padStart(2, '0')}:${parsed[2]}`;
  };
  return { open: padSlot(open), close: padSlot(close) };
}

function daySummary(day: Weekday, value: WeeklyHoursNamed): string {
  const list = value[day] ?? [];
  if (!list.length) return 'Closed';
  return list.map(r => `${r.open}–${r.close}`).join(', ');
}

export default function HoursEditor({ value, onChange, timeZone, disabled = false }: HoursEditorProps) {
  const tz = useMemo(
    () => timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC',
    [timeZone],
  );
  const [applySource, setApplySource] = useState<Weekday>('monday');
  const [tab, setTab] = useState(0);
  const activeDay = WEEKDAYS[tab];

  function patchDay(day: Weekday, nextIntervals: HoursInterval[]): void {
    const merged = { ...emptyWeeklyHours(), ...value };
    merged[day] = nextIntervals;
    onChange(merged);
  }

  function setClosed(day: Weekday, closed: boolean): void {
    if (closed) {
      patchDay(day, []);
      return;
    }
    if (!(value[day]?.length ?? 0)) patchDay(day, [{ open: '09:00', close: '17:00' }]);
  }

  function replaceRanges(day: Weekday, ranges: HoursInterval[]): void {
    patchDay(day, ranges.map(({ open, close }) => normalizeHmPair(open, close)));
  }

  function updateSlot(day: Weekday, index: number, patch: Partial<HoursInterval>): void {
    const cur = [...(value[day] ?? [])];
    cur[index] = { ...cur[index], ...patch };
    replaceRanges(day, cur);
  }

  function addRange(day: Weekday): void {
    replaceRanges(day, [...(value[day] ?? []), { open: '09:00', close: '17:00' }]);
  }

  function removeRange(day: Weekday, index: number): void {
    const cur = [...(value[day] ?? [])];
    cur.splice(index, 1);
    replaceRanges(day, cur);
  }

  function applyTemplateToAll(source: Weekday): void {
    const template = cloneIntervals(value[source] ?? []);
    const next = emptyWeeklyHours();
    WEEKDAYS.forEach(d => {
      next[d] = cloneIntervals(template);
    });
    onChange(next);
  }

  const weeklyError = WEEKDAYS.flatMap(d => (value[d] ?? []).map(iv => validateInterval(iv))).find(Boolean);
  const closed = !(value[activeDay]?.length ?? 0);

  return (
    <LocalizationProvider dateAdapter={AdapterLuxon}>
      <Stack spacing={1.5}>
        {weeklyError ? (
          <Alert severity="warning" sx={{ py: 0.5, '& .MuiAlert-message': { fontSize: '0.8125rem' } }}>
            {weeklyError}
          </Alert>
        ) : null}

        <Paper variant="outlined" sx={{ p: { xs: 1.25, sm: 1.5 } }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Copy one day to the whole week
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'stretch', sm: 'center' },
              gap: { xs: 1.5, sm: 2 },
              flexWrap: 'wrap',
            }}
          >
            <FormControl
              size="small"
              sx={{
                minWidth: { xs: '100%', sm: 140 },
                m: 0,
                '& .MuiInputBase-root': { marginTop: 0 },
              }}
            >
              <InputLabel id="hours-source-label">From</InputLabel>
              <Select
                labelId="hours-source-label"
                label="From"
                value={applySource}
                disabled={disabled}
                onChange={(e: SelectChangeEvent<Weekday>) => setApplySource(e.target.value as Weekday)}
              >
                {WEEKDAYS.map(d => (
                  <MenuItem key={d} value={d}>
                    {formatDayTitle(d)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="contained"
              size="small"
              disabled={disabled}
              onClick={() => applyTemplateToAll(applySource)}
              sx={{
                alignSelf: { xs: 'stretch', sm: 'center' },
                flexShrink: 0,
                height: { sm: 40 },
              }}
            >
              Apply to all days
            </Button>
          </Box>
        </Paper>

        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{
              minHeight: 40,
              '& .MuiTab-root': { minHeight: 40, minWidth: 44, px: 1, py: 0.5, fontSize: '0.8rem' },
            }}
          >
            {WEEKDAYS.map(d => {
              const hasHours = (value[d]?.length ?? 0) > 0;
              return (
                <Tab
                  key={d}
                  label={TAB_SHORT[d]}
                  sx={{
                    fontWeight: hasHours ? 600 : 400,
                    color: hasHours ? 'text.primary' : 'text.secondary',
                  }}
                />
              );
            })}
          </Tabs>
        </Box>

        <Box
          sx={{
            borderRadius: 1,
            bgcolor: 'grey.50',
            border: '1px solid',
            borderColor: 'divider',
            p: { xs: 1.25, sm: 2 },
          }}
        >
          <Stack spacing={1.5}>
            <Stack sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { sm: 'center' }, gap: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                {formatDayTitle(activeDay)}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                {daySummary(activeDay, value)}
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={closed}
                    disabled={disabled}
                    size="small"
                    onChange={(_, ck) => setClosed(activeDay, ck)}
                    aria-label={`${activeDay} closed`}
                  />
                }
                label={<Typography variant="body2">Closed</Typography>}
                sx={{ mr: 0 }}
              />
            </Stack>

            {!closed &&
              (value[activeDay] ?? []).map((iv, idx) => {
                const err = validateInterval(iv);
                const openLux = hmToLuxonClock(iv.open, tz) ?? hmToLuxonClock('00:00', tz)!;
                const closeLux = hmToLuxonClock(iv.close, tz) ?? hmToLuxonClock('00:00', tz)!;
                return (
                  <Box
                    key={`${activeDay}-${idx}`}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr 1fr auto', sm: 'minmax(0,1fr) minmax(0,1fr) auto' },
                      gap: { xs: 1, sm: 1.5 },
                      alignItems: 'center',
                      pt: idx ? 1 : 0,
                      borderTop: idx ? '1px dashed' : 'none',
                      borderColor: 'divider',
                    }}
                  >
                    <TimePicker
                      label="Opens"
                      ampm={false}
                      views={['hours', 'minutes']}
                      format="HH:mm"
                      disabled={disabled}
                      value={openLux}
                      onChange={next => {
                        if (!next) return;
                        updateSlot(activeDay, idx, { open: luxonClockToHm(next) });
                      }}
                      slotProps={{
                        textField: {
                          size: 'small',
                          fullWidth: true,
                          margin: 'dense',
                          error: Boolean(err),
                        },
                      }}
                    />
                    <TimePicker
                      label="Closes"
                      ampm={false}
                      views={['hours', 'minutes']}
                      format="HH:mm"
                      disabled={disabled}
                      value={closeLux}
                      onChange={next => {
                        if (!next) return;
                        updateSlot(activeDay, idx, { close: luxonClockToHm(next) });
                      }}
                      slotProps={{
                        textField: {
                          size: 'small',
                          fullWidth: true,
                          margin: 'dense',
                          error: Boolean(err),
                          helperText: err || undefined,
                        },
                      }}
                    />
                    <IconButton
                      aria-label="Remove time range"
                      disabled={disabled}
                      onClick={() => removeRange(activeDay, idx)}
                      color="error"
                      size="small"
                    >
                      <DeleteOutlineOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Box>
                );
              })}

            {!closed ? (
              <Button
                startIcon={<AddIcon />}
                variant="outlined"
                size="small"
                disabled={disabled}
                onClick={() => addRange(activeDay)}
                sx={{ alignSelf: 'flex-start' }}
              >
                Add range
              </Button>
            ) : null}
          </Stack>
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.4 }}>
          Overnight: set close earlier than open on the clock (e.g. 18:00 → 02:00). Times are 24h; open-now uses{' '}
          {tz}.
        </Typography>
      </Stack>
    </LocalizationProvider>
  );
}
