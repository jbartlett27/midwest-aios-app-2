import React, { forwardRef, useState } from 'react';
import { isBusinessDate } from './businessDate.js';

// Reject the typo before it reaches the form model. Other form entries stay intact.
const DateInput = forwardRef(function DateInput({ onChange, ...props }, ref) {
  const [error, setError] = useState('');
  return <><input {...props} ref={ref} type="date" min="2000-01-01" max="2100-12-31"
    aria-invalid={error ? true : undefined} onChange={event => {
      const value = event.target.value;
      if (event.target.validity.badInput || (value !== '' && !isBusinessDate(value))) {
        setError('Use a real date between 2000 and 2100. The date was not changed.');
        return;
      }
      setError('');
      if (onChange) onChange(event);
    }} />{error && <span role="alert" style={{display:'block',fontSize:11,color:'#f87171'}}>{error}</span>}</>;
});
export default DateInput;
