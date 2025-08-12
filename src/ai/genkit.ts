import {genkit} from 'genkit';
import {anthropic} from 'genkitx-anthropic';

export const ai = genkit({
  plugins: [anthropic()],
  model: 'anthropic/claude-3-5-sonnet-20241022',
});
