// Steps integer number inputs for custom spinners, supports holding
function startIncrement(inc, input) {
    let multiplier = 250;
    startTimer(inc, input, multiplier);

    function startTimer(inc, input, multiplier) {
        const accelerate = (inc) => {
            if (!incTimer) return;
            addStep(inc, input);
            multiplier = Math.max(10, multiplier / 1.25);
            incTimer = setTimeout(() => accelerate(inc), multiplier);
        };
        clearTimeout(incTimer);
        addStep(inc, input);
        incTimer = setTimeout(() => accelerate(inc), multiplier);
    };

    function addStep(inc, input) {
        const min = parseFloat(input.min);
        const max = parseFloat(input.max);
        const value = input.value.strToNum();
        if (input.value === "" || isNaN(value)) {
            input.value = inc.numToStr(input.step);
            return;
        }

        let newValue = (value + inc).roundDecimals(2);
        if (newValue != value) {
            newValue = Math.max(min, Math.min(max, newValue));
            input.value = newValue.numToStr(input.value);
        }
    }
}

const stopIncrement = () => (clearTimeout(incTimer), incTimer = null);

function handleIncUp(e) {
    e.preventDefault();
    const input = e.target.closest('.input-wrapper').querySelector('input');
    const step = parseFloat(input.step);
    startIncrement( step, input);
    input.dispatchEvent(new Event('change', { bubbles: true }));
}

function handleIncDown(e) {
    e.preventDefault();
    const input = e.target.closest('.input-wrapper').querySelector('input');
    const step = parseFloat(input.step);
    startIncrement( -(step), input);
    input.dispatchEvent(new Event('change', { bubbles: true }));
}

function createSpinnerListeners(wrapper) {
    const up = wrapper.querySelector('.spinner-up');
    const down = wrapper.querySelector('.spinner-down')
    up.addEventListener('pointerdown', handleIncUp);
    up.addEventListener('pointerup', stopIncrement);
    up.addEventListener('pointerleave', stopIncrement);
    up.addEventListener('pointercancel', stopIncrement);
    down.addEventListener('pointerdown', handleIncDown);
    down.addEventListener('pointerup', stopIncrement);
    down.addEventListener('pointerleave', stopIncrement);
    down.addEventListener('pointercancel', stopIncrement);
}

function removeSpinnerListeners(wrapper) {
    const up = wrapper.querySelector('.spinner-up');
    const down = wrapper.querySelector('.spinner-down')
    up.removeEventListener('pointerdown', handleIncUp);
    up.removeEventListener('pointerup', stopIncrement);
    up.removeEventListener('pointerleave', stopIncrement);
    up.removeEventListener('pointercancel', stopIncrement);
    down.removeEventListener('pointerdown', handleIncDown);
    down.removeEventListener('pointerup', stopIncrement);
    down.removeEventListener('pointerleave', stopIncrement);
    down.removeEventListener('pointercancel', stopIncrement);
}
