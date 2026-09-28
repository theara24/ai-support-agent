import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateKnowledgeDocumentDto {
  @ApiProperty({ example: 'Return Policy & Refunds' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Customers may return any items within 30 days of purchase...' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ example: 'text/plain' })
  @IsOptional()
  @IsString()
  contentType?: string;
}
